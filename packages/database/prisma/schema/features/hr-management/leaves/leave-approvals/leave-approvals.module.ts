import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { LeaveApprovalsController } from "./leave-approvals.controller.js";
import { LeaveApprovalsRepository } from "./leave-approvals.repository.js";
import { LeaveApprovalsService } from "./leave-approvals.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [LeaveApprovalsController],
  providers: [LeaveApprovalsRepository, LeaveApprovalsService],
  exports: [LeaveApprovalsService],
})
export class LeaveApprovalsModule {}
