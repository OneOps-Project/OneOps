import {
  Injectable,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { AccountsRepository } from "./accounts.repository.js";
import {
  AccountsEmployees,
  AccountsAudit,
  AccountsLifecycle,
  type AccountActor,
} from "./accounts.contracts.js";
import { hashPassword } from "./password.js";
import type {
  CreateAccount,
  GroupInput,
  ListAccounts,
  UpdateAccount,
} from "./dto/accounts.dto.js";
import type { Transaction } from "../../../../core/database/database.module.js";
@Injectable()
export class AccountsService {
  constructor(
    private readonly repository: AccountsRepository,
    private readonly employees: AccountsEmployees,
    private readonly audit: AccountsAudit,
    private readonly lifecycle: AccountsLifecycle,
  ) {}
  list(query: ListAccounts) {
    return this.repository.list(query);
  }
  get(id: string, tx?: Transaction) {
    return this.repository.get(id, tx);
  }
  count() {
    return this.repository.count();
  }
  async employeesForAccounts(query: string) {
    const employees = await this.employees.list(query);
    const linked = new Set(
      (
        await this.repository.linkedEmployeeIds(
          employees.map((employee) => employee.id),
        )
      ).map((account) => account.employeeId),
    );
    return employees.filter((employee) => !linked.has(employee.id));
  }
  async create(input: CreateAccount, actor: AccountActor) {
    const passwordHash = await hashPassword(input.password);
    return this.repository.transaction(async (tx) => {
      const employee = await this.employees.get(input.employeeId, tx);
      if (employee.status !== "ACTIVE")
        throw new ConflictException(
          "Chỉ cấp tài khoản cho hồ sơ nhân viên đang hoạt động.",
        );
      const data = {
        employeeId: input.employeeId,
        username: input.username,
        email: input.email,
        role: input.role,
      };
      const row = await this.repository.create(
        {
          ...data,
          passwordHash,
          employeeCode: employee.code,
          displayName: employee.name,
        },
        tx,
      );
      await this.audit.record(
        {
          actorId: actor.id,
          actorName: actor.username,
          action: "account.created",
          entityType: "account",
          entityId: row.id,
          after: this.snapshot(row),
        },
        tx,
      );
      return row;
    });
  }
  async bootstrap(input: CreateAccount) {
    const passwordHash = await hashPassword(input.password);
    return this.repository.transaction(async (tx) => {
      if (await this.repository.count(tx))
        throw new ConflictException(
          "Hệ thống đã có tài khoản; không được khởi tạo lại.",
        );
      const employee = await this.employees.get(input.employeeId, tx);
      const data = {
        employeeId: input.employeeId,
        username: input.username,
        email: input.email,
        role: input.role,
      };
      const row = await this.repository.create(
        {
          ...data,
          role: "MANAGER",
          passwordHash,
          employeeCode: employee.code,
          displayName: employee.name,
        },
        tx,
      );
      await this.lifecycle.bootstrap(row.id, tx);
      await this.audit.record(
        {
          actorId: row.id,
          actorName: row.username,
          action: "account.bootstrapped",
          entityType: "account",
          entityId: row.id,
          after: this.snapshot(row),
        },
        tx,
      );
      return row;
    });
  }
  private snapshot(row: {
    username: string;
    email: string;
    role: string;
    status: string;
    employeeId: string;
    version: number;
  }) {
    return {
      username: row.username,
      email: row.email,
      role: row.role,
      status: row.status,
      employeeId: row.employeeId,
      version: row.version,
    };
  }
  async update(id: string, input: UpdateAccount, actor: AccountActor) {
    return this.mutate(
      id,
      input.version,
      { username: input.username, email: input.email },
      actor,
      "account.updated",
    );
  }
  async changeRole(
    id: string,
    role: string,
    version: number,
    actor: AccountActor,
  ) {
    return this.mutate(id, version, { role }, actor, "account.role-changed");
  }
  async changeStatus(
    id: string,
    status: string,
    reason: string,
    version: number,
    actor: AccountActor,
  ) {
    if (id === actor.id && status === "LOCKED")
      throw new ForbiddenException("Không thể tự khóa tài khoản đang sử dụng.");
    return this.mutate(
      id,
      version,
      { status },
      actor,
      "account.status-changed",
      reason,
    );
  }
  async resetPassword(
    id: string,
    password: string,
    version: number,
    actor: AccountActor,
  ) {
    return this.mutate(
      id,
      version,
      { passwordHash: await hashPassword(password) },
      actor,
      "account.password-reset",
    );
  }
  private async mutate(
    id: string,
    version: number,
    patch: {
      username?: string;
      email?: string;
      role?: string;
      status?: string;
      passwordHash?: string;
    },
    actor: AccountActor,
    action: string,
    reason?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      const before = await this.repository.get(id, tx);
      await this.lifecycle.beforeChange(id, patch, actor.id, tx);
      if (patch.username && patch.username !== before.username)
        await this.lifecycle.bindTaskIdentity(before, tx);
      const row = await this.repository.update(id, version, patch, tx);
      if (patch.status === "LOCKED" || patch.passwordHash || patch.role)
        await this.lifecycle.revokeSessions(id, tx);
      const affectedTasks =
        patch.status === "LOCKED" && before.status !== "LOCKED"
          ? await this.lifecycle.flagTasks(row, actor, tx)
          : 0;
      await this.audit.record(
        {
          actorId: actor.id,
          actorName: actor.username,
          action,
          entityType: "account",
          entityId: id,
          before: this.snapshot(before),
          after: {
            ...this.snapshot(row),
            ...(reason ? { reason } : {}),
            ...(patch.passwordHash ? { passwordChanged: true } : {}),
            affectedTasks,
          },
        },
        tx,
      );
      return { ...row, affectedTasks };
    });
  }
  async setAdministration(id: string, value: boolean, actor: AccountActor) {
    return this.repository.transaction(async (tx) => {
      const account = await this.get(id, tx);
      if (account.role !== "MANAGER")
        throw new ConflictException(
          "Chỉ tài khoản role Quản lý được cấp quyền quản trị.",
        );
      await this.lifecycle.setAdministration(id, value, tx);
      await this.lifecycle.revokeSessions(id, tx);
      await this.audit.record(
        {
          actorId: actor.id,
          actorName: actor.username,
          action: "account.administration-changed",
          entityType: "account",
          entityId: id,
          after: { manageAccounts: value },
        },
        tx,
      );
      return { accountId: id, manageAccounts: value };
    });
  }
  async history(id: string, page: number) {
    await this.get(id);
    return this.audit.list("account", id, page);
  }
  groups(query: string) {
    return this.repository.listGroups(query);
  }
  group(id: string) {
    return this.repository.getGroup(id);
  }
  async groupHistory(id: string, page: number) {
    await this.group(id);
    return this.audit.list("account-group", id, page);
  }
  async saveGroup(
    input: GroupInput,
    actor: AccountActor,
    id?: string,
    version?: number,
  ) {
    return this.repository.transaction(async (tx) => {
      const before = id ? await this.repository.getGroup(id, tx) : null;
      const group = await this.repository.saveGroup(input, tx, id, version);
      const snapshot = (g: typeof group) => ({
        name: g.name,
        directory: g.directory,
        ownerId: g.ownerId,
        ownerName: g.owner.displayName,
        description: g.description,
        memberIds: g.members.map((m) => m.accountId),
        memberNames: g.members.map(
          (m) => `${m.account.displayName} (@${m.account.username})`,
        ),
        version: g.version,
      });
      await this.audit.record(
        {
          actorId: actor.id,
          actorName: actor.username,
          action: id ? "account-group.updated" : "account-group.created",
          entityType: "account-group",
          entityId: group.id,
          ...(before ? { before: snapshot(before) } : {}),
          after: snapshot(group),
        },
        tx,
      );
      return group;
    });
  }
}
