import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import { Prisma, type WorkTask } from "@oneops/database";
import { recordSchema } from "./dto/tasks.dto.js";
import type {
  RecordInput,
  RecordDto,
  ListQuery,
  StatusHistoryItem,
  ReassignmentHistoryItem,
  ReassignmentFlag,
} from "./dto/tasks.dto.js";
@Injectable()
export class TasksRepository {
  constructor(private readonly db: Database) {}
  private table(tx: Transaction = this.db) {
    return tx.workTask;
  }
  private dto(row: WorkTask): RecordDto {
    return recordSchema.parse({
      id: row.id,
      module: "tasks",
      code: row.code,
      name: row.name,
      scope: row.scope,
      status: row.status,
      date: row.date.toISOString().slice(0, 10),
      assignee: row.assignee,
      reviewer: row.reviewer,
      deadline: row.deadline?.toISOString(),
      note: row.note,
      attachmentLinks: row.attachmentLinks,
      statusHistory: row.statusHistory as RecordDto["statusHistory"],
      reassignmentFlag: row.reassignmentFlag as RecordDto["reassignmentFlag"],
      reassignmentHistory:
        row.reassignmentHistory as RecordDto["reassignmentHistory"],
      fields: row.fields as RecordDto["fields"],
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  async list(query: ListQuery) {
    const where: Prisma.WorkTaskWhereInput = {
      ...(query.scope !== undefined ? { scope: query.scope } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignee !== undefined ? { assignee: query.assignee } : {}),
      ...(query.reviewer !== undefined ? { reviewer: query.reviewer } : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: "insensitive" } },
              { name: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return this.db.$transaction(
      async (tx) => ({
        items: (
          await this.table(tx).findMany({
            where,
            orderBy: [{ date: "desc" }, { id: "asc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
          })
        ).map((row) => this.dto(row)),
        total: await this.table(tx).count({ where }),
        page: query.page,
        pageSize: query.pageSize,
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async get(id: string, tx: Transaction = this.db) {
    const row = await this.table(tx).findUnique({ where: { id } });
    if (!row)
      throw new NotFoundException("Không tìm thấy bản ghi trong phân hệ này.");
    return this.dto(row);
  }
  async create(input: RecordInput, tx: Transaction = this.db) {
    const now = new Date().toISOString();
    const initialStatusHistory = [
      {
        status: input.status,
        actor: input.assignee || "system",
        actorRole: "assignee" as const,
        timestamp: now,
        reason: "Tạo task mới",
      },
    ];

    return this.dto(
      await this.table(tx).create({
        data: {
          ...input,
          scope: input.scope || "",
          assignee: input.assignee || "",
          reviewer: input.reviewer || "",
          deadline: input.deadline ? new Date(input.deadline) : null,
          note: input.note || "",
          attachmentLinks: input.attachmentLinks || [],
          statusHistory: initialStatusHistory,
          reassignmentFlag: { needed: false, reason: "" },
          reassignmentHistory: [],
          fields: (input.fields || {}) as any, // Cast để tương thích với Prisma JSON khi dùng passthrough()
          codeKey: input.code.normalize("NFKC").toLocaleLowerCase("vi"),
          date: new Date(input.date + "T00:00:00.000Z"),
        },
      }),
    );
  }
  async update(
    id: string,
    input: Partial<RecordInput> & { version: number },
    tx: Transaction = this.db,
  ) {
    const { version, date, deadline, fields, ...patch } = input;
    const result = await this.table(tx).updateMany({
      where: { id, version },
      data: {
        ...patch,
        ...(patch.code
          ? { codeKey: patch.code.normalize("NFKC").toLocaleLowerCase("vi") }
          : {}),
        ...(date ? { date: new Date(date + "T00:00:00.000Z") } : {}),
        ...(deadline !== undefined
          ? { deadline: deadline ? new Date(deadline) : null }
          : {}),
        ...(fields !== undefined ? { fields: fields as any } : {}), // Cast để tương thích với Prisma JSON
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException(
        "Bản ghi đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.get(id, tx);
  }
  async remove(id: string, version: number, tx: Transaction = this.db) {
    const result = await this.table(tx).deleteMany({ where: { id, version } });
    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException("Bản ghi đã thay đổi. Vui lòng tải lại.");
    }
    return { id };
  }

  // ROUND1-4: Thay đổi trạng thái với lịch sử
  async changeStatus(
    id: string,
    newStatus: string,
    historyItem: StatusHistoryItem,
    newDeadline: string | undefined,
    tx: Transaction = this.db,
  ) {
    const current = await this.get(id, tx);
    const updatedHistory = [...current.statusHistory, historyItem];

    const updateData: {
      status: string;
      statusHistory: Prisma.InputJsonValue;
      version: { increment: number };
      deadline?: Date;
    } = {
      status: newStatus,
      statusHistory: updatedHistory as Prisma.InputJsonValue,
      version: { increment: 1 },
    };

    if (newDeadline) {
      updateData.deadline = new Date(newDeadline);
    }

    const result = await this.table(tx).updateMany({
      where: { id, version: current.version },
      data: updateData,
    });

    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException(
        "Bản ghi đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.get(id, tx);
  }

  // ROUND1-5: Lấy task "Việc của tôi" với sắp xếp và deadline status
  async getMyTasks(userId: string, tx: Transaction = this.db) {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await this.table(tx).findMany({
      where: {
        OR: [{ assignee: userId }, { reviewer: userId }],
        status: {
          in: ["Cần làm", "Đang làm", "Làm lại", "Chờ kiểm tra"],
        },
      },
      orderBy: [{ deadline: "asc" }, { id: "asc" }],
    });

    return tasks.map((row) => {
      const dto = this.dto(row);
      let deadlineStatus: "overdue" | "upcoming" | "normal" = "normal";

      if (row.deadline) {
        if (row.deadline < now) {
          deadlineStatus = "overdue";
        } else if (row.deadline <= in24Hours) {
          deadlineStatus = "upcoming";
        }
      }

      return {
        ...dto,
        role: row.assignee === userId ? "assignee" : "reviewer",
        deadlineStatus,
      };
    });
  }

  // ROUND1-6: Giao lại task
  async reassignTask(
    id: string,
    historyItem: ReassignmentHistoryItem,
    removeFlagIfNeeded: boolean,
    tx: Transaction = this.db,
  ) {
    const current = await this.get(id, tx);
    const updatedHistory = [...current.reassignmentHistory, historyItem];

    const updateData: {
      assignee: string;
      reassignmentHistory: Prisma.InputJsonValue;
      version: { increment: number };
      reassignmentFlag?: Prisma.InputJsonValue;
    } = {
      assignee: historyItem.toAssignee,
      reassignmentHistory: updatedHistory as Prisma.InputJsonValue,
      version: { increment: 1 },
    };

    // Gỡ cờ "Cần giao lại" nếu đã giao lại
    if (removeFlagIfNeeded && current.reassignmentFlag.needed) {
      updateData.reassignmentFlag = {
        needed: false,
        reason: "",
      } as Prisma.InputJsonValue;
    }

    const result = await this.table(tx).updateMany({
      where: { id, version: current.version },
      data: updateData,
    });

    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException(
        "Bản ghi đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.get(id, tx);
  }

  // ROUND1-6: Lấy thống kê task của nhân viên
  async getEmployeeTaskStats(employeeId: string, tx: Transaction = this.db) {
    const openTasks = await this.table(tx).count({
      where: {
        assignee: employeeId,
        status: {
          notIn: ["Hoàn thành", "Đã hủy"],
        },
      },
    });

    const inProgressTasks = await this.table(tx).count({
      where: {
        assignee: employeeId,
        status: "Đang làm",
      },
    });

    return {
      employeeId,
      openTasks,
      inProgressTasks,
    };
  }

  // ROUND1-7: Gắn cờ "Cần giao lại"
  async flagForReassignment(
    ids: string[],
    flag: ReassignmentFlag,
    tx: Transaction = this.db,
  ) {
    const result = await this.table(tx).updateMany({
      where: {
        id: { in: ids },
        status: {
          notIn: ["Hoàn thành", "Đã hủy"],
        },
      },
      data: {
        reassignmentFlag: flag as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });

    return { flaggedCount: result.count };
  }

  // ROUND1-7: Lấy danh sách task "Cần giao lại"
  async getFlaggedTasks(tx: Transaction = this.db) {
    const tasks = await this.table(tx).findMany({
      where: {
        reassignmentFlag: {
          path: ["needed"],
          equals: true,
        },
        status: {
          notIn: ["Hoàn thành", "Đã hủy"],
        },
      },
      orderBy: [{ deadline: "asc" }, { id: "asc" }],
    });

    return tasks.map((row) => this.dto(row));
  }

  // ROUND1-2: Kiểm tra task trùng (cùng assignee, tên gần giống, chưa xong)
  async findSimilarTasks(
    assignee: string,
    name: string,
    tx: Transaction = this.db,
  ) {
    if (!assignee || !name) return [];

    const nameNormalized = name.normalize("NFKC").toLocaleLowerCase("vi");
    const nameWords = nameNormalized.split(/\s+/).filter((w) => w.length > 2);

    if (nameWords.length === 0) return [];

    const tasks = await this.table(tx).findMany({
      where: {
        assignee,
        status: {
          notIn: ["Hoàn thành", "Đã hủy"],
        },
      },
      take: 5,
    });

    // So sánh độ tương đồng đơn giản
    return tasks
      .filter((task) => {
        const taskNameNormalized = task.name
          .normalize("NFKC")
          .toLocaleLowerCase("vi");
        const matchCount = nameWords.filter((word) =>
          taskNameNormalized.includes(word),
        ).length;
        return matchCount >= Math.min(2, nameWords.length);
      })
      .map((row) => this.dto(row));
  }

  // ROUND1-4: Tính tỷ lệ hoàn thành
  async getCompletionRate(scope?: string, tx: Transaction = this.db) {
    const where: Prisma.WorkTaskWhereInput = scope ? { scope } : {};

    const total = await this.table(tx).count({ where });

    const completed = await this.table(tx).count({
      where: {
        ...where,
        status: "Hoàn thành",
      },
    });

    return {
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}
