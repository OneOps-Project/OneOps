import {
  Module,
  Global,
  Injectable,
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
  ParseUUIDPipe,
  ForbiddenException,
  ConflictException,
  UseGuards,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { z } from "zod";
import {
  HrManagementModule,
  EmployeeDirectoryService,
  EmployeeDirectoryAccess,
  employeeInput,
} from "../hr-management/index.js";
import {
  WorkManagementModule,
  TasksService,
  NotificationsService,
} from "../work-management/index.js";
import {
  AccountsModule,
  AccountsService,
  AccountsIdentityService,
  AccountsAccess,
  AccountsEmployees,
  AccountsAudit,
  AccountsLifecycle,
  type AccountActor,
  type AccountAudit,
  accountSetupInput,
} from "./access-control/accounts/index.js";
import {
  TenantAuthModule,
  TenantAuthService,
  AuthAccounts,
} from "./access-control/tenant-auth/index.js";
import {
  RolesPermissionsModule,
  RolesPermissionsService,
  permissionInput,
} from "./access-control/roles-permissions/index.js";
import {
  ChecklogModule,
  ChecklogService,
  ChecklogAccess,
  auditInputSchema,
} from "./checklog/index.js";
import {
  RequestAccessPolicy,
  SessionGuard,
  type AccessRequest,
} from "../../core/auth/session.guard.js";
import { SchemaPipe } from "../../core/pipes/validation.pipe.js";
import type { Transaction } from "../../core/database/database.module.js";
@Injectable()
class EmployeeAdapter extends AccountsEmployees {
  constructor(private readonly employees: EmployeeDirectoryService) {
    super();
  }
  get(id: string, tx?: Transaction) {
    return this.employees.get(id, tx);
  }
  list(q: string) {
    return this.employees.list(q);
  }
}
@Injectable()
class AuditAdapter extends AccountsAudit {
  constructor(private readonly audit: ChecklogService) {
    super();
  }
  async record(event: AccountAudit, tx: Transaction) {
    await this.audit.record(
      auditInputSchema.parse({
        ...event,
        module: "tenant-system/access-control/accounts",
      }),
      tx,
    );
  }
  list(kind: "account" | "account-group", id: string, page: number) {
    return this.audit.list(kind, id, page);
  }
}
@Injectable()
class AuthAdapter extends AuthAccounts {
  constructor(
    private readonly accounts: AccountsIdentityService,
    private readonly permissions: RolesPermissionsService,
  ) {
    super();
  }
  async authenticate(login: string, password: string) {
    const row = await this.accounts.authenticate(login, password);
    return row ? this.identity(row.id) : null;
  }
  async identity(id: string) {
    const [account, permissions] = await Promise.all([
      this.accounts.get(id),
      this.permissions.get(id),
    ]);
    return {
      id: account.id,
      username: account.username,
      role: account.role as "EMPLOYEE" | "MANAGER",
      status: account.status,
      version: account.version,
      superAdmin: account.role === "MANAGER" && permissions.superAdmin,
      manageAccounts: account.role === "MANAGER" && permissions.manageAccounts,
    };
  }
}
@Injectable()
export class AccountsAuthorization extends AccountsAccess {
  constructor(private readonly auth: TenantAuthService) {
    super();
  }
  async authorize(cookie?: string) {
    const actor = await this.auth.principal(cookie);
    if (actor.role !== "MANAGER" || !(actor.superAdmin || actor.manageAccounts))
      throw new ForbiddenException("Bạn không có quyền quản trị tài khoản.");
    return actor;
  }
}
@Injectable()
class ChecklogAuthorization extends ChecklogAccess {
  constructor(private readonly auth: TenantAuthService) {
    super();
  }
  async authorize(cookie?: string) {
    const actor = await this.auth.principal(cookie);
    if (!actor.superAdmin)
      throw new ForbiddenException(
        "Bạn không có quyền xem nhật ký tập trung. Chức năng hiện dành cho Quản trị cấp cao.",
      );
    return { id: actor.id, username: actor.username };
  }
}
@Injectable()
class EmployeeAccessAdapter extends EmployeeDirectoryAccess {
  constructor(private readonly access: AccountsAuthorization) {
    super();
  }
  async authorize(cookie?: string) {
    await this.access.authorize(cookie);
  }
}
@Injectable()
class LifecycleAdapter extends AccountsLifecycle {
  constructor(
    private readonly permissions: RolesPermissionsService,
    private readonly auth: TenantAuthService,
    private readonly tasks: TasksService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }
  async bindTaskIdentity(
    account: { id: string; username: string },
    tx: Transaction,
  ) {
    await this.tasks.bindAccountUsername(account, tx);
  }
  async setAdministration(id: string, value: boolean, tx: Transaction) {
    const current = await this.permissions.get(id, tx);
    if (current.superAdmin)
      throw new ConflictException(
        "Không thể thu hồi quyền quản trị cấp cao qua quyền quản trị tài khoản.",
      );
    await this.permissions.grant(id, value, tx);
  }
  async bootstrap(id: string, tx: Transaction) {
    await this.permissions.bootstrap(id, tx);
  }
  async beforeChange(
    id: string,
    change: { role?: string; status?: string },
    actorId: string,
    tx: Transaction,
  ) {
    const [target, actor] = await Promise.all([
      this.permissions.get(id, tx),
      this.permissions.get(actorId, tx),
    ]);
    if (target.superAdmin && !actor.superAdmin)
      throw new ForbiddenException(
        "Chỉ Quản trị cấp cao được thay đổi tài khoản quản trị cấp cao.",
      );
    if (change.role === "EMPLOYEE" || change.status === "LOCKED")
      await this.permissions.assertCanDowngrade(id, tx);
    if (change.role === "EMPLOYEE") await this.permissions.grant(id, false, tx);
  }
  async revokeSessions(id: string, tx: Transaction) {
    await this.auth.revoke(id, tx);
  }
  async flagTasks(
    account: {
      id: string;
      employeeId: string;
      employeeCode: string;
      username: string;
      displayName: string;
    },
    actor: AccountActor,
    tx: Transaction,
  ) {
    const tasks = await this.tasks.flagAccountTasks(account, actor.id, tx);
    if (!tasks.length) return 0;
    const recipients = new Set(
      tasks
        .map((task) => task.managerAccountId)
        .filter((id): id is string => !!id),
    );
    // Legacy tasks without a manager reference go to account administrators for review.
    if (tasks.some((task) => !task.managerAccountId))
      for (const manager of await this.permissions.managers(tx))
        recipients.add(manager.accountId);
    for (const id of recipients)
      await this.notifications.create(
        {
          recipientId: id,
          accountId: account.id,
          message: `${tasks.length} công việc của ${account.displayName} cần giao lại sau khi khóa tài khoản.`,
          taskIds: tasks.map((task) => task.id),
        },
        tx,
      );
    return tasks.length;
  }
}
@Injectable()
class SystemAccessPolicy extends RequestAccessPolicy {
  constructor(private readonly auth: TenantAuthService) {
    super();
  }
  async authorize(request: AccessRequest) {
    const origin = request.headers.origin;
    if (
      origin &&
      ![
        process.env.WEB_ORIGIN || "http://localhost:3002",
        ...(process.env.NODE_ENV === "test" ? ["http://localhost:3117"] : []),
      ].includes(origin)
    )
      throw new ForbiddenException("Nguồn yêu cầu không được phép.");
    const path = (request.path || request.url.split("?")[0]).replace(/\/$/, "");
    if (
      ["/api/v1/auth/login", "/api/v1/auth/logout", "/api/v1/auth/me"].includes(
        path,
      )
    )
      return;
    await this.auth.principal(request.headers.cookie);
  }
}
type IntegrationRequest = { headers: { cookie?: string } };
@Injectable()
class AccountAdministrationGuard implements CanActivate {
  constructor(private readonly access: AccountsAuthorization) {}
  async canActivate(context: ExecutionContext) {
    await this.access.authorize(
      context.switchToHttp().getRequest<IntegrationRequest>().headers.cookie,
    );
    return true;
  }
}
@Controller("account-permissions")
@UseGuards(AccountAdministrationGuard)
class AccountPermissionsController {
  constructor(
    private readonly access: AccountsAuthorization,
    private readonly accounts: AccountsService,
    private readonly permissions: RolesPermissionsService,
  ) {}
  @Get(":id") async get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: IntegrationRequest,
  ) {
    await this.access.authorize(req.headers.cookie);
    await this.accounts.get(id);
    return this.permissions.get(id);
  }
  @Post() async grant(
    @Body(new SchemaPipe(permissionInput))
    input: z.infer<typeof permissionInput>,
    @Req() req: IntegrationRequest,
  ) {
    const actor = await this.access.authorize(req.headers.cookie);
    if (!actor.superAdmin)
      throw new ForbiddenException(
        "Chỉ Quản trị cấp cao được cấp hoặc thu hồi quyền quản trị tài khoản.",
      );
    return this.accounts.setAdministration(
      input.accountId,
      input.manageAccounts,
      actor,
    );
  }
}
@Controller("account-notifications")
class AccountNotificationsController {
  constructor(
    private readonly auth: TenantAuthService,
    private readonly notifications: NotificationsService,
  ) {}
  @Get() async list(@Req() req: IntegrationRequest) {
    const actor = await this.auth.principal(req.headers.cookie);
    return this.notifications.list(actor.id);
  }
  @Post(":id/read") async read(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: IntegrationRequest,
  ) {
    const actor = await this.auth.principal(req.headers.cookie);
    return this.notifications.read(id, actor.id);
  }
}
@Injectable()
export class AccountSetupService {
  constructor(
    private readonly accounts: AccountsService,
    private readonly employees: EmployeeDirectoryService,
  ) {}
  async bootstrap(input: {
    code: string;
    name: string;
    email: string;
    username: string;
    password: string;
  }) {
    input = accountSetupInput.parse(input);
    if (await this.accounts.count())
      throw new ConflictException("Đã có tài khoản. Không thể khởi tạo lại.");
    const employee = await this.employees.create(
      employeeInput.parse({
        code: input.code,
        name: input.name,
        email: input.email,
      }),
    );
    return this.accounts.bootstrap({
      employeeId: employee.id,
      username: input.username,
      email: input.email,
      role: "MANAGER",
      password: input.password,
    });
  }
}
@Global()
@Module({
  imports: [
    AccountsModule,
    TenantAuthModule,
    RolesPermissionsModule,
    ChecklogModule,
    HrManagementModule,
    WorkManagementModule,
  ],
  providers: [
    ChecklogAuthorization,
    { provide: ChecklogAccess, useExisting: ChecklogAuthorization },
    AccountAdministrationGuard,
    EmployeeAccessAdapter,
    { provide: EmployeeDirectoryAccess, useExisting: EmployeeAccessAdapter },
    EmployeeAdapter,
    AuditAdapter,
    AuthAdapter,
    LifecycleAdapter,
    AccountsAuthorization,
    AccountSetupService,
    { provide: AccountsEmployees, useExisting: EmployeeAdapter },
    { provide: AccountsAudit, useExisting: AuditAdapter },
    { provide: AuthAccounts, useExisting: AuthAdapter },
    { provide: AccountsLifecycle, useExisting: LifecycleAdapter },
    { provide: AccountsAccess, useExisting: AccountsAuthorization },
    { provide: RequestAccessPolicy, useClass: SystemAccessPolicy },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  controllers: [AccountPermissionsController, AccountNotificationsController],
  exports: [
    ChecklogAccess,
    EmployeeDirectoryAccess,
    AccountsEmployees,
    AccountsAudit,
    AuthAccounts,
    AccountsLifecycle,
    AccountsAccess,
    AccountSetupService,
  ],
})
export class TenantAccountsIntegrationModule {}
