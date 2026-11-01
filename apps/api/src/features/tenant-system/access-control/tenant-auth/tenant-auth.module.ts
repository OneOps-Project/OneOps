import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { TenantAuthRepository } from "./tenant-auth.repository.js";
import { TenantAuthService } from "./tenant-auth.service.js";
import { TenantAuthController } from "./tenant-auth.controller.js";
@Module({
  imports: [DatabaseModule],
  providers: [TenantAuthRepository, TenantAuthService],
  controllers: [TenantAuthController],
  exports: [TenantAuthService],
})
export class TenantAuthModule {}
