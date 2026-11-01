import {
  validatedCreateSchema as createSchema,
  updateSchema,
  changeStatusSchema,
  reassignSchema,
} from "./dto/tasks.dto.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { TasksRepository } from "./tasks.repository.js";
import type {
  RecordInput,
  ListQuery,
  ChangeStatusInput,
  ReassignInput,
  StatusHistoryItem,
  ReassignmentFlag,
} from "./dto/tasks.dto.js";
import type { Transaction } from "../../../../core/database/database.module.js";
@Injectable()
export class TasksService {
  constructor(private readonly repository: TasksRepository) {}
  list(query: ListQuery) {
    return this.repository.list(query);
  }
  get(id: string, tx?: Transaction) {
    return this.repository.get(id, tx);
  }
  create(input: RecordInput, tx?: Transaction) {
    // Kiểm tra reviewer !== assignee
    if (input.reviewer && input.assignee && input.reviewer === input.assignee) {
      throw new BadRequestException("Người kiểm tra phải khác người phụ trách");
    }

    // Mặc định reviewer là người tạo nếu không chỉ định (spec 8.2)
    // Tạm thời để trống, sẽ set khi có auth
    const validatedInput = new SchemaPipe(createSchema).transform(input);

    return this.repository.create(validatedInput, tx);
  }

  // ROUND1-2: Kiểm tra task trùng
  async checkSimilarTasks(assignee: string, name: string, tx?: Transaction) {
    return this.repository.findSimilarTasks(assignee, name, tx);
  }
  async update(
    id: string,
    input: Partial<RecordInput> & { version: number },
    tx?: Transaction,
  ) {
    const patch = new SchemaPipe(updateSchema).transform(input);
    const current = await this.repository.get(id, tx);

    // Validate reviewer !== assignee trên bản cuối
    const mergedAssignee = patch.assignee ?? current.assignee;
    const mergedReviewer = patch.reviewer ?? current.reviewer;
    if (mergedReviewer && mergedAssignee && mergedReviewer === mergedAssignee) {
      throw new BadRequestException("Người kiểm tra phải khác người phụ trách");
    }

    new SchemaPipe(createSchema).transform({
      code: current.code,
      name: current.name,
      status: current.status,
      date: current.date,
      scope: current.scope,
      assignee: current.assignee,
      reviewer: current.reviewer,
      note: current.note,
      fields: current.fields,
      ...Object.fromEntries(
        Object.entries(patch).filter(([key]) => key !== "version"),
      ),
    });
    return this.repository.update(id, patch, tx);
  }
  remove(id: string, version: number, tx?: Transaction) {
    return this.repository.remove(id, version, tx);
  }

  // ROUND1-4: Máy trạng thái theo Bảng 9.1b
  private validateStateTransition(
    currentStatus: string,
    newStatus: string,
    actorRole: "manager" | "assignee" | "reviewer",
  ): { valid: boolean; reason?: string } {
    // TR-02: Người phụ trách: Cần làm → Đang làm
    if (
      currentStatus === "Cần làm" &&
      newStatus === "Đang làm" &&
      actorRole === "assignee"
    ) {
      return { valid: true };
    }

    // TR-03: Người phụ trách: Đang làm → Chờ kiểm tra
    if (
      currentStatus === "Đang làm" &&
      newStatus === "Chờ kiểm tra" &&
      actorRole === "assignee"
    ) {
      return { valid: true };
    }

    // TR-09: Người phụ trách: Làm lại → Chờ kiểm tra
    if (
      currentStatus === "Làm lại" &&
      newStatus === "Chờ kiểm tra" &&
      actorRole === "assignee"
    ) {
      return { valid: true };
    }

    // TR-04: Người kiểm tra: → Hoàn thành
    if (
      currentStatus === "Chờ kiểm tra" &&
      newStatus === "Hoàn thành" &&
      actorRole === "reviewer"
    ) {
      return { valid: true };
    }

    // TR-05: Người kiểm tra: → Làm lại (bắt buộc lý do)
    if (
      currentStatus === "Chờ kiểm tra" &&
      newStatus === "Làm lại" &&
      actorRole === "reviewer"
    ) {
      return { valid: true };
    }

    // Quản lý có thể thực hiện mọi chuyển (để xử lý ngoại lệ)
    if (actorRole === "manager") {
      return { valid: true };
    }

    // Hoàn thành và Đã hủy bị khóa (BR-ST-07)
    if (currentStatus === "Hoàn thành" || currentStatus === "Đã hủy") {
      return {
        valid: false,
        reason: `Task đã ${currentStatus} không thể thay đổi trạng thái`,
      };
    }

    return {
      valid: false,
      reason: `Không thể chuyển từ "${currentStatus}" sang "${newStatus}" với vai trò ${actorRole}`,
    };
  }

  async changeStatus(id: string, input: ChangeStatusInput, tx?: Transaction) {
    const validated = new SchemaPipe(changeStatusSchema).transform(input);
    const current = await this.repository.get(id, tx);

    // Kiểm tra quyền dựa trên actor
    let actorRole = validated.actorRole;
    if (actorRole === "assignee" && validated.actorId !== current.assignee) {
      throw new ForbiddenException("Bạn không phải người phụ trách task này");
    }
    if (actorRole === "reviewer" && validated.actorId !== current.reviewer) {
      throw new ForbiddenException("Bạn không phải người kiểm tra task này");
    }

    // Validate chuyển trạng thái
    const validation = this.validateStateTransition(
      current.status,
      validated.status,
      actorRole,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.reason);
    }

    // TR-05: Làm lại cần lý do
    if (validated.status === "Làm lại" && !validated.reason) {
      throw new BadRequestException("Cần nhập lý do khi yêu cầu làm lại");
    }

    // TR-05: Làm lại khi deadline đã qua cần deadline mới từ Quản lý
    if (validated.status === "Làm lại" && current.deadline) {
      const now = new Date();
      const deadline = new Date(current.deadline);
      if (deadline < now && !validated.newDeadline) {
        throw new BadRequestException(
          "Task đã quá hạn, cần Quản lý đặt deadline mới trước khi làm lại",
        );
      }
    }

    // Tạo lịch sử trạng thái (BR-ST-06)
    const historyItem: StatusHistoryItem = {
      status: validated.status,
      actor: validated.actorId,
      actorRole: validated.actorRole,
      timestamp: new Date().toISOString(),
      reason: validated.reason || "",
    };

    return this.repository.changeStatus(
      id,
      validated.status,
      historyItem,
      validated.newDeadline,
      tx,
    );
  }

  // ROUND1-4: Tính tỷ lệ hoàn thành
  async getCompletionRate(scope?: string, tx?: Transaction) {
    return this.repository.getCompletionRate(scope, tx);
  }

  // ROUND1-5: Việc của tôi
  async getMyTasks(userId: string, tx?: Transaction) {
    return this.repository.getMyTasks(userId, tx);
  }

  // ROUND1-6: Giao lại task
  async reassignTask(id: string, input: ReassignInput, tx?: Transaction) {
    const validated = new SchemaPipe(reassignSchema).transform(input);
    const current = await this.repository.get(id, tx);

    // Kiểm tra người giao lại khác người phụ trách hiện tại
    if (validated.newAssignee === current.assignee) {
      throw new BadRequestException(
        "Người phụ trách mới phải khác người hiện tại",
      );
    }

    // Kiểm tra người phụ trách khác người kiểm tra
    if (validated.newAssignee === current.reviewer) {
      throw new BadRequestException(
        "Người phụ trách không thể là người kiểm tra",
      );
    }

    const historyItem = {
      fromAssignee: current.assignee,
      toAssignee: validated.newAssignee,
      managerId: validated.managerId,
      reason: validated.reason,
      timestamp: new Date().toISOString(),
    };

    return this.repository.reassignTask(id, historyItem, true, tx);
  }

  // ROUND1-6: Thống kê task của nhân viên
  async getEmployeeTaskStats(employeeId: string, tx?: Transaction) {
    return this.repository.getEmployeeTaskStats(employeeId, tx);
  }

  // ROUND1-7: Gắn cờ "Cần giao lại" (public service export)
  async flagTasksForReassignment(
    params: {
      assigneeId: string;
      from?: string; // ISO date
      to?: string; // ISO date
      reason: string;
      source: "leave_approved" | "account_locked" | "left_team";
    },
    tx?: Transaction,
  ) {
    // Tìm các task chưa xong của assignee
    const tasks = await this.repository.list({
      page: 1,
      pageSize: 1000,
      assignee: params.assigneeId,
    });

    let taskIds = tasks.items
      .filter((t) => t.status !== "Hoàn thành" && t.status !== "Đã hủy")
      .map((t) => t.id);

    // Lọc theo khoảng thời gian nếu có (leave approved)
    if (params.from && params.to) {
      const fromDate = new Date(params.from);
      const toDate = new Date(params.to);

      taskIds = tasks.items
        .filter((t) => {
          if (t.status === "Hoàn thành" || t.status === "Đã hủy") return false;
          if (!t.deadline) return false;
          const deadline = new Date(t.deadline);
          return deadline >= fromDate && deadline <= toDate;
        })
        .map((t) => t.id);
    }

    if (taskIds.length === 0) {
      return { flaggedCount: 0 };
    }

    const flag: ReassignmentFlag = {
      needed: true,
      reason: params.reason,
      source: params.source,
      timestamp: new Date().toISOString(),
    };

    return this.repository.flagForReassignment(taskIds, flag, tx);
  }

  // ROUND1-7: Danh sách task cần giao lại
  async getFlaggedTasks(tx?: Transaction) {
    return this.repository.getFlaggedTasks(tx);
  }
}
