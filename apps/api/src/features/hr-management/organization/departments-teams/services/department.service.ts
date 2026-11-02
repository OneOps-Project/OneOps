import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateDepartmentInput,
  HistoryQuery,
  ListQuery,
  OrganizationStatus,
  UpdateDepartmentInput,
} from "../dto/departments-teams.dto.js";
import type { OrgActor } from "../guards/org-actor.guard.js";
import { DepartmentRepository } from "../repositories/department.repository.js";
import type { JsonObject } from "../dto/json-value.dto.js";
import { OrgHistoryService } from "./org-history.service.js";

@Injectable()
export class DepartmentService {
  constructor(
    private readonly repository: DepartmentRepository,
    private readonly history: OrgHistoryService,
  ) {}

  list(query: ListQuery, actor: OrgActor) {
    return this.repository.list(query, actor);
  }

  async get(id: string, actor: OrgActor) {
    await this.assertViewable(id, actor);
    const department = await this.repository.findById(id, undefined, actor);
    if (!department) throw new NotFoundException("Không tìm thấy Department.");
    return department;
  }

  async getHistory(id: string, query: HistoryQuery, actor: OrgActor) {
    if (
      !actor.isSuperAdmin &&
      (actor.role !== "MANAGER" ||
        !(await this.repository.canViewHistory(id, actor.id)))
    )
      throw new NotFoundException("Không tìm thấy Department.");
    return this.history.list("DEPARTMENT", id, query);
  }

  async create(input: CreateDepartmentInput, actor: OrgActor) {
    if (
      !actor.isSuperAdmin &&
      (actor.role !== "MANAGER" ||
        !actor.permissions.includes("organization.department.create"))
    )
      throw new ForbiddenException("Bạn không có quyền tạo phòng ban.");
    try {
      return await this.repository.transaction(async (tx) => {
        if (await this.repository.findActiveByName(input.name, undefined, tx))
          throw new ConflictException(
            "Tên Department đang được sử dụng bởi một Department hoạt động.",
          );
        const department = await this.repository.create(tx, input, actor.id);
        if (!department)
          throw new NotFoundException("Không thể đọc Department vừa tạo.");
        await this.history.record(tx, {
          entityType: "DEPARTMENT",
          entityId: department.id,
          action: "CREATE",
          performedBy: actor.id,
          newValue: {
            name: department.name,
            description: department.description,
            administratorIds: department.administratorIds,
            accessUserIds: department.accessUserIds,
            accessGroupIds: department.accessGroupIds,
            status: department.status,
          },
        });
        return department;
      });
    } catch (error) {
      this.throwIfUniqueViolation(error);
      throw error;
    }
  }

  async update(id: string, input: UpdateDepartmentInput, actor: OrgActor) {
    await this.assertManageable(id, actor);
    const current = await this.requireDepartment(id);
    if (
      input.name !== undefined &&
      input.name !== current.name &&
      (await this.repository.findActiveByName(input.name, id))
    )
      throw new ConflictException(
        "Tên Department đang được sử dụng bởi một Department hoạt động.",
      );
    try {
      return await this.repository.transaction(async (tx) => {
        const department = await this.repository.update(tx, id, input);
        if (!department)
          throw new NotFoundException("Không tìm thấy Department.");
        const oldValue: JsonObject = {
          ...(input.name !== undefined ? { name: current.name } : {}),
          ...(input.description !== undefined
            ? { description: current.description }
            : {}),
          ...(input.administratorIds !== undefined
            ? { administratorIds: current.administratorIds }
            : {}),
          ...(input.accessUserIds !== undefined
            ? { accessUserIds: current.accessUserIds }
            : {}),
          ...(input.accessGroupIds !== undefined
            ? { accessGroupIds: current.accessGroupIds }
            : {}),
        };
        const newValue: JsonObject = {
          ...(input.name !== undefined ? { name: department.name } : {}),
          ...(input.description !== undefined
            ? { description: department.description }
            : {}),
          ...(input.administratorIds !== undefined
            ? { administratorIds: department.administratorIds }
            : {}),
          ...(input.accessUserIds !== undefined
            ? { accessUserIds: department.accessUserIds }
            : {}),
          ...(input.accessGroupIds !== undefined
            ? { accessGroupIds: department.accessGroupIds }
            : {}),
        };
        await this.history.record(tx, {
          entityType: "DEPARTMENT",
          entityId: id,
          action: "UPDATE",
          performedBy: actor.id,
          oldValue,
          newValue,
        });
        return department;
      });
    } catch (error) {
      this.throwIfUniqueViolation(error);
      throw error;
    }
  }

  async setStatus(id: string, status: OrganizationStatus, actor: OrgActor) {
    await this.assertManageable(id, actor);
    const current = await this.requireDepartment(id);
    if (current.status === status) return current;
    return this.repository.transaction(async (tx) => {
      if (
        status === "INACTIVE" &&
        (await this.repository.hasActiveTeams(id, tx))
      ) {
        const activeNames = current.teams
          .filter((team) => team.status === "ACTIVE")
          .map((team) => team.name);
        throw new ConflictException(
          `Cần ngừng hoạt động các Team sau trước: ${activeNames.join(", ")}.`,
        );
      }
      if (status === "INACTIVE" && (await this.checkHasActiveProjects(id)))
        throw new ConflictException(
          "Chỉ có thể ngừng hoạt động Department khi không còn Project đang hoạt động.",
        );
      const department = await this.repository.setStatus(tx, id, status);
      if (!department)
        throw new NotFoundException("Không tìm thấy Department.");
      await this.history.record(tx, {
        entityType: "DEPARTMENT",
        entityId: id,
        action: "UPDATE",
        performedBy: actor.id,
        oldValue: { status: current.status },
        newValue: { status: department.status },
      });
      return department;
    });
  }

  private async checkHasActiveProjects(departmentId: string): Promise<boolean> {
    // TODO: [INTEGRATION] - Call real Project module API here. Mocked to false for now.
    void departmentId;
    return false;
  }

  async assertCanManage(id: string, actor: OrgActor) {
    await this.assertManageable(id, actor);
  }

  async assertCanCreateTeam(id: string, actor: OrgActor) {
    if (actor.isSuperAdmin) return;
    if (
      actor.role !== "MANAGER" ||
      !(await this.repository.canCreateTeam(id, actor.id))
    )
      throw new ForbiddenException(
        "Chỉ Quản lý có quyền truy cập Department mới được tạo Team.",
      );
  }

  async assertCanManageTeam(id: string, actor: OrgActor) {
    if (actor.isSuperAdmin) return;
    if (
      actor.role !== "MANAGER" ||
      !(await this.repository.canManageTeam(id, actor.id))
    )
      throw new ForbiddenException(
        "Bạn không được phân công quản lý Team này.",
      );
  }

  async assertCanView(id: string, actor: OrgActor) {
    await this.assertViewable(id, actor);
  }

  async canManage(id: string, actor: OrgActor) {
    return (
      actor.isSuperAdmin ||
      (actor.role === "MANAGER" &&
        (await this.repository.canManage(id, actor.id)))
    );
  }

  async canManageTeam(id: string, actor: OrgActor) {
    return (
      actor.isSuperAdmin ||
      (actor.role === "MANAGER" &&
        (await this.repository.canManageTeam(id, actor.id)))
    );
  }

  private async assertViewable(id: string, actor: OrgActor) {
    if (!(await this.repository.canView(id, actor)))
      throw new NotFoundException("Không tìm thấy Department.");
  }

  private async assertManageable(id: string, actor: OrgActor) {
    if (actor.isSuperAdmin) return;
    if (
      actor.role !== "MANAGER" ||
      !(await this.repository.canManage(id, actor.id))
    )
      throw new ForbiddenException(
        "Bạn không được phân công quản lý Department này.",
      );
  }

  private async requireDepartment(id: string) {
    const department = await this.repository.findById(id);
    if (!department) throw new NotFoundException("Không tìm thấy Department.");
    return department;
  }

  private throwIfUniqueViolation(error: unknown): void {
    if (this.repository.isUniqueViolation(error))
      throw new ConflictException(
        "Tên Department đang được sử dụng bởi một Department hoạt động.",
      );
  }
}
