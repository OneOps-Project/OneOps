import { Module } from "@nestjs/common";
import { TenantAccountsIntegrationModule } from "./tenant-system.accounts.module.js";
@Module({ imports: [TenantAccountsIntegrationModule] })
export class TenantSystemModule {}
