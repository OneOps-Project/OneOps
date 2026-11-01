import { AccountsIdentityService } from "./accounts-identity.service.js";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { AccountsRepository } from "./accounts.repository.js";
import { AccountsService } from "./accounts.service.js";
import { AccountsController } from "./accounts.controller.js";
import { AccountsGuard } from "./guards/accounts.guard.js";
@Module({
  imports: [DatabaseModule],
  providers: [
    AccountsIdentityService,
    AccountsRepository,
    AccountsService,
    AccountsGuard,
  ],
  controllers: [AccountsController],
  exports: [AccountsService, AccountsIdentityService],
})
export class AccountsModule {}
