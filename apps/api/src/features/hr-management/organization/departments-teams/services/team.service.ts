import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateTeamInput,
  HistoryQuery,
  ListQuery,
  OrganizationStatus,
  PreviewCreateTeamTransferInput,
  TransferMemberInput,
  UpdateTeamInput,
} from "../dto/departments-teams.dto.js";
import type { OrgActor } from "../guards/org-actor.guard.js";
import { OrgEventListener } from "../events/org-event.listener.js";
import { TeamRepository } from "../repositories/team.repository.js";
import { DepartmentService } from "./department.service.js";
import { OrgHistoryService } from "./org-history.service.js";
import type { JsonObject } from "../dto/json-value.dto.js";

@Injectable()
export class TeamService {
  constructor(
    private readonly repository: TeamRepository,
    private readonly departments: DepartmentService,
    private readonly history: OrgHistoryService,
    private readonly events: OrgEventListener,
  ) {}

  async listByDepartment(
    departmentId: string,
    query: ListQuery,
    actor: OrgActor,
  ) {
    await this.departments.assertCanView(departmentId, actor);
    return this.repository.listByDepartment(departmentId, query, actor);
  }

  async get(id: string, actor: OrgActor) {
    const team = await this.requireTeam(id);
    if (
      !actor.isSuperAdmin &&
      !team.memberUserIds.includes(actor.id) &&
      !(await this.departments.canManage(team.departmentId, actor))
    )
      throw new NotFoundException("Không tìm thấy Team.");
    if (await this.departments.canManageTeam(team.id, actor)) return team;
    return {
      ...team,
      department: { ...team.department, administratorIds: [] },
    };
  }

  async getHistory(id: string, query: HistoryQuery, actor: OrgActor) {
    const team = await this.get(id, actor);
    await this.departments.assertCanManageTeam(team.id, actor);
    return this.history.list("TEAM", team.id, query);
  }

  async create(input: CreateTeamInput, actor: OrgActor) {
    await this.departments.assertCanCreateTeam(input.departmentId, actor);
    try {
      const { team, transferred } = await this.repository.transaction(
        async (tx) => {
          const department = await this.repository.findDepartment(
            input.departmentId,
            tx,
          );
          if (!department)
            throw new NotFoundException("Không tìm thấy Department.");
          if (department.status !== "ACTIVE")
            throw new ConflictException(
              "Chỉ có thể thêm Team vào Department đang hoạt động.",
            );
          const memberTransfers: Array<{ userId: string; oldTeamId: string }> =
            [];
          for (const userId of input.memberUserIds) {
            const membership = await this.repository.findMembership(userId, tx);
            if (!membership) continue;
            if (!input.confirmTransferUserIds?.includes(userId))
              throw new ConflictException(
                "Nhân viên đang thuộc Team khác. Hãy xem trước thông tin và xác nhận chuyển trước khi lưu.",
              );
            await this.departments.assertCanManageTeam(
              membership.teamId,
              actor,
            );
            memberTransfers.push({
              userId,
              oldTeamId: membership.teamId,
            });
          }
          const transferIds = new Set(
            memberTransfers.map(({ userId }) => userId),
          );
          const team = await this.repository.create(
            tx,
            {
              ...input,
              memberUserIds: input.memberUserIds.filter(
                (userId) => !transferIds.has(userId),
              ),
            },
            actor.id,
          );
          if (!team) throw new NotFoundException("Không thể đọc Team vừa tạo.");
          const transferred: Array<{ userId: string; oldTeamId: string }> = [];
          for (const transfer of memberTransfers) {
            const previous = await this.repository.transferMember(
              tx,
              team.id,
              transfer.userId,
            );
            if (!previous) continue;
            transferred.push(transfer);
            await this.history.record(tx, {
              entityType: "TEAM",
              entityId: previous.teamId,
              action: "TRANSFER",
              performedBy: actor.id,
              oldValue: {
                userId: transfer.userId,
                teamId: previous.teamId,
                role: previous.role,
              },
              newValue: {
                userId: transfer.userId,
                teamId: team.id,
                role: "MEMBER",
              },
            });
            await this.history.record(tx, {
              entityType: "TEAM",
              entityId: team.id,
              action: "TRANSFER",
              performedBy: actor.id,
              oldValue: {
                userId: transfer.userId,
                teamId: previous.teamId,
              },
              newValue: {
                userId: transfer.userId,
                teamId: team.id,
                role: "MEMBER",
              },
            });
          }
          const created = await this.requireTeam(team.id, tx);
          await this.history.record(tx, {
            entityType: "TEAM",
            entityId: created.id,
            action: "CREATE",
            performedBy: actor.id,
            newValue: {
              name: created.name,
              departmentId: created.departmentId,
              description: created.description,
              managerIds: created.managerIds,
              memberUserIds: created.memberUserIds,
              memberGroupIds: created.memberGroupIds,
              status: created.status,
            },
          });
          return { team: created, transferred };
        },
      );
      for (const event of transferred) this.events.emitMemberRemoved(event);
      return team;
    } catch (error) {
      this.throwIfPrismaConflict(error);
      throw error;
    }
  }

  async previewCreateTransfers(
    departmentId: string,
    input: PreviewCreateTeamTransferInput,
    actor: OrgActor,
  ) {
    await this.departments.assertCanCreateTeam(departmentId, actor);
    const department = await this.repository.findDepartment(departmentId);
    if (!department) throw new NotFoundException("Không tìm thấy Department.");
    if (department.status !== "ACTIVE")
      throw new ConflictException(
        "Chỉ có thể thêm Team vào Department đang hoạt động.",
      );
    const transfers = [];
    for (const userId of input.userIds) {
      const membership = await this.repository.findMembershipWithTeam(userId);
      if (membership)
        await this.departments.assertCanManageTeam(membership.teamId, actor);
      transfers.push({
        userId,
        oldTeamId: membership?.team.id ?? null,
        oldTeamName: membership?.team.name ?? null,
        willTransfer: membership !== null,
      });
    }
    return { departmentId, transfers };
  }

  async update(id: string, input: UpdateTeamInput, actor: OrgActor) {
    const current = await this.requireTeam(id);
    await this.departments.assertCanManageTeam(id, actor);
    if (input.managerIds !== undefined && input.managerIds.length === 0)
      throw new ConflictException("Mỗi Team phải có ít nhất một quản lý.");
    const nextManagers = input.managerIds ?? current.managerIds;
    const currentMembers = current.memberUserIds.filter(
      (userId) => !current.managerIds.includes(userId),
    );
    const nextUsers = input.memberUserIds ?? currentMembers;
    const nextMemberIds = new Set([...nextManagers, ...nextUsers]);
    const removedUserIds = current.memberUserIds.filter(
      (userId) => !nextMemberIds.has(userId),
    );
    const removedEvents = removedUserIds.map((userId) => ({
      userId,
      oldTeamId: id,
    }));
    const confirmedTransfers = new Set(input.confirmTransferUserIds ?? []);
    try {
      const updated = await this.repository.transaction(async (tx) => {
        for (const userId of nextUsers) {
          const membership = await this.repository.findMembership(userId, tx);
          if (!membership || membership.teamId === id) continue;
          if (!confirmedTransfers.has(userId))
            throw new ConflictException(
              "Nhân viên đang thuộc Team khác. Hãy xem trước thông tin và xác nhận chuyển trước khi lưu.",
            );
          const oldTeam = await this.requireTeam(membership.teamId, tx);
          await this.departments.assertCanManageTeam(oldTeam.id, actor);
          const previous = await this.repository.transferMember(tx, id, userId);
          if (!previous) continue;
          await this.history.record(tx, {
            entityType: "TEAM",
            entityId: previous.teamId,
            action: "TRANSFER",
            performedBy: actor.id,
            oldValue: { userId, teamId: previous.teamId, role: previous.role },
            newValue: { userId, teamId: id, role: "MEMBER" },
          });
          await this.history.record(tx, {
            entityType: "TEAM",
            entityId: id,
            action: "TRANSFER",
            performedBy: actor.id,
            oldValue: { userId, teamId: previous.teamId },
            newValue: { userId, teamId: id, role: "MEMBER" },
          });
          removedEvents.push({ userId, oldTeamId: previous.teamId });
        }
        const team = await this.repository.update(tx, id, input);
        if (!team) throw new NotFoundException("Không tìm thấy Team.");
        const oldValue: JsonObject = {
          ...(input.name !== undefined ? { name: current.name } : {}),
          ...(input.description !== undefined
            ? { description: current.description }
            : {}),
          ...(input.managerIds !== undefined
            ? { managerIds: current.managerIds }
            : {}),
          ...(input.memberUserIds !== undefined
            ? { memberUserIds: current.memberUserIds }
            : {}),
          ...(input.memberGroupIds !== undefined
            ? { memberGroupIds: current.memberGroupIds }
            : {}),
        };
        const newValue: JsonObject = {
          ...(input.name !== undefined ? { name: team.name } : {}),
          ...(input.description !== undefined
            ? { description: team.description }
            : {}),
          ...(input.managerIds !== undefined
            ? { managerIds: team.managerIds }
            : {}),
          ...(input.memberUserIds !== undefined
            ? { memberUserIds: team.memberUserIds }
            : {}),
          ...(input.memberGroupIds !== undefined
            ? { memberGroupIds: team.memberGroupIds }
            : {}),
        };
        await this.history.record(tx, {
          entityType: "TEAM",
          entityId: id,
          action: "UPDATE",
          performedBy: actor.id,
          oldValue,
          newValue,
        });
        return team;
      });
      for (const event of removedEvents) this.events.emitMemberRemoved(event);
      return updated;
    } catch (error) {
      this.throwIfPrismaConflict(error);
      throw error;
    }
  }

  async setStatus(id: string, status: OrganizationStatus, actor: OrgActor) {
    const current = await this.requireTeam(id);
    await this.departments.assertCanManageTeam(id, actor);
    if (current.status === status) return current;
    if (status === "ACTIVE" && current.department.status !== "ACTIVE")
      throw new ConflictException(
        "Cần kích hoạt Department trước khi kích hoạt lại Team.",
      );
    if (status === "INACTIVE" && (await this.checkHasOpenTasks(id)))
      throw new ConflictException(
        "Chỉ có thể ngừng hoạt động Team khi không còn công việc đang mở.",
      );
    return this.repository.transaction(async (tx) => {
      const team = await this.repository.setStatus(tx, id, status);
      if (!team) throw new NotFoundException("Không tìm thấy Team.");
      await this.history.record(tx, {
        entityType: "TEAM",
        entityId: id,
        action: status === "INACTIVE" ? "DEACTIVATE" : "UPDATE",
        performedBy: actor.id,
        oldValue: { status: current.status },
        newValue: { status: team.status },
      });
      return team;
    });
  }

  private async checkHasOpenTasks(teamId: string): Promise<boolean> {
    // TODO: [INTEGRATION] - Call real Task module API here. Mocked to false for now.
    void teamId;
    return false;
  }

  async previewTransfer(
    teamId: string,
    input: TransferMemberInput,
    actor: OrgActor,
  ) {
    if (input.targetTeamId !== teamId)
      throw new ConflictException(
        "targetTeamId phải trùng với Team trên đường dẫn.",
      );
    const target = await this.requireTeam(teamId);
    await this.departments.assertCanManageTeam(teamId, actor);
    if (target.status !== "ACTIVE" || target.department.status !== "ACTIVE")
      throw new ConflictException(
        "Chỉ có thể chuyển nhân viên vào Team và Department đang hoạt động.",
      );
    const transfers = [];
    for (const userId of input.userIds) {
      const membership = await this.repository.findMembershipWithTeam(userId);
      if (!membership || membership.teamId === teamId) {
        transfers.push({
          userId,
          oldTeamId: membership?.teamId ?? null,
          oldTeamName: membership?.team.name ?? null,
          willTransfer: membership?.teamId !== teamId,
        });
        continue;
      }
      await this.departments.assertCanManageTeam(membership.teamId, actor);
      if (
        membership.role === "MANAGER" &&
        (await this.repository.countManagers(membership.teamId)) <= 1
      )
        throw new ConflictException(
          "Không thể chuyển quản lý cuối cùng khỏi Team.",
        );
      transfers.push({
        userId,
        oldTeamId: membership.team.id,
        oldTeamName: membership.team.name,
        willTransfer: true,
      });
    }
    return { targetTeamId: teamId, targetTeamName: target.name, transfers };
  }

  async transfer(teamId: string, input: TransferMemberInput, actor: OrgActor) {
    if (input.targetTeamId !== teamId)
      throw new ConflictException(
        "targetTeamId phải trùng với Team trên đường dẫn.",
      );
    const target = await this.requireTeam(teamId);
    await this.departments.assertCanManageTeam(teamId, actor);
    if (target.status !== "ACTIVE" || target.department.status !== "ACTIVE")
      throw new ConflictException(
        "Chỉ có thể chuyển nhân viên vào Team và Department đang hoạt động.",
      );

    const removed: Array<{ userId: string; oldTeamId: string }> = [];
    try {
      const result = await this.repository.transaction(async (tx) => {
        const transfers = [];
        for (const userId of input.userIds) {
          const current = await this.repository.findMembership(userId, tx);
          if (current?.teamId === teamId) continue;

          if (current) {
            const oldTeam = await this.requireTeam(current.teamId, tx);
            await this.departments.assertCanManageTeam(oldTeam.id, actor);
            if (
              current.role === "MANAGER" &&
              (await this.repository.countManagers(current.teamId, tx)) <= 1
            )
              throw new ConflictException(
                "Không thể chuyển quản lý cuối cùng khỏi Team.",
              );
          }

          const previous = await this.repository.transferMember(
            tx,
            teamId,
            userId,
          );
          if (previous) {
            removed.push({ userId, oldTeamId: previous.teamId });
            await this.history.record(tx, {
              entityType: "TEAM",
              entityId: previous.teamId,
              action: "TRANSFER",
              performedBy: actor.id,
              oldValue: {
                userId,
                teamId: previous.teamId,
                role: previous.role,
              },
              newValue: { userId, teamId, role: previous.role },
            });
            await this.history.record(tx, {
              entityType: "TEAM",
              entityId: teamId,
              action: "TRANSFER",
              performedBy: actor.id,
              oldValue: { userId, teamId: previous.teamId },
              newValue: { userId, teamId, role: previous.role },
            });
          } else {
            await this.history.record(tx, {
              entityType: "TEAM",
              entityId: teamId,
              action: "UPDATE",
              performedBy: actor.id,
              newValue: { userId, teamId, role: "MEMBER" },
            });
          }
          transfers.push({ userId, oldTeamId: previous?.teamId ?? null });
        }
        return { team: await this.requireTeam(teamId, tx), transfers };
      });
      for (const event of removed) this.events.emitMemberRemoved(event);
      return result;
    } catch (error) {
      this.throwIfPrismaConflict(error);
      throw error;
    }
  }

  private async requireTeam(
    id: string,
    tx?: Parameters<TeamRepository["findById"]>[1],
  ) {
    const team = await this.repository.findById(id, tx);
    if (!team) throw new NotFoundException("Không tìm thấy Team.");
    return team;
  }

  private throwIfPrismaConflict(error: unknown): void {
    const conflict = this.repository.writeConflict(error);
    if (conflict === "duplicate")
      throw new ConflictException(
        "Tên Team đã tồn tại trong Department hoặc nhân viên đã thuộc Team khác.",
      );
    if (conflict === "concurrent")
      throw new ConflictException(
        "Dữ liệu đã được thay đổi đồng thời. Vui lòng tải lại và thử lại.",
      );
  }
}
