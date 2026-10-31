import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AccountsModule } from "./access-control/accounts/index.js";
import {
  PermissionGuard,
  RolesPermissionsModule,
} from "./access-control/roles-permissions/index.js";
import {
  SessionGuard,
  TenantAuthModule,
} from "./access-control/tenant-auth/index.js";
import { AccountsCredentials } from "./accounts-credentials.js";
import { WorkflowRulesModule } from "./automation-hub/workflow-rules/index.js";
import { ChecklogModule } from "./checklog/index.js";
import { WorkPoliciesModule } from "./organization/work-policies/index.js";
import { PermissionAudit } from "./permission-audit.js";

@Module({
  imports: [
    AccountsModule,
    ChecklogModule,
    WorkPoliciesModule,
    WorkflowRulesModule,
    RolesPermissionsModule.forRoot({
      audit: PermissionAudit,
      imports: [ChecklogModule],
    }),
    TenantAuthModule.forRoot({
      credentials: AccountsCredentials,
      imports: [AccountsModule],
    }),
  ],
  // Every route needs a valid session unless it opts out with `@Public()`;
  // routes decorated with `@RequirePermission()` then consult the matrix. Both
  // guards stay owned by their features, the composition only registers them.
  providers: [
    { provide: APP_GUARD, useExisting: SessionGuard },
    { provide: APP_GUARD, useExisting: PermissionGuard },
  ],
})
export class TenantSystemModule {}
