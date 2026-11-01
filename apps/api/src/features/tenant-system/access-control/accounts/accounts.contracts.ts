import type { Transaction } from "../../../../core/database/database.module.js";
export type AccountActor = {
  id: string;
  username: string;
  role: "EMPLOYEE" | "MANAGER";
  superAdmin: boolean;
  manageAccounts: boolean;
};
export type EmployeeReference = {
  id: string;
  code: string;
  name: string;
  email: string;
  status: string;
};
export type AccountAudit = {
  actorId: string;
  actorName: string;
  action: string;
  entityType: "account" | "account-group";
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};
export abstract class AccountsAccess {
  abstract authorize(cookie: string | undefined): Promise<AccountActor>;
}
export abstract class AccountsEmployees {
  abstract get(id: string, tx?: Transaction): Promise<EmployeeReference>;
  abstract list(query: string): Promise<EmployeeReference[]>;
}
export abstract class AccountsAudit {
  abstract record(event: AccountAudit, tx: Transaction): Promise<void>;
  abstract list(
    entityType: "account" | "account-group",
    entityId: string,
    page: number,
  ): Promise<{
    items: unknown[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
export abstract class AccountsLifecycle {
  abstract bindTaskIdentity(
    account: { id: string; username: string },
    tx: Transaction,
  ): Promise<void>;
  abstract setAdministration(
    accountId: string,
    value: boolean,
    tx: Transaction,
  ): Promise<void>;
  abstract bootstrap(accountId: string, tx: Transaction): Promise<void>;
  abstract beforeChange(
    id: string,
    change: { role?: string; status?: string },
    actorId: string,
    tx: Transaction,
  ): Promise<void>;
  abstract revokeSessions(id: string, tx: Transaction): Promise<void>;
  abstract flagTasks(
    account: {
      id: string;
      employeeId: string;
      username: string;
      displayName: string;
      employeeCode: string;
    },
    actor: AccountActor,
    tx: Transaction,
  ): Promise<number>;
}
