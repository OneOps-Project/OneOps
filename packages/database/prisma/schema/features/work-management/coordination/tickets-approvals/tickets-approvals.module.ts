import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { TicketsApprovalsRepository } from "./tickets-approvals.repository.js";
import { TicketsApprovalsService } from "./tickets-approvals.service.js";
import { TicketsApprovalsController } from "./tickets-approvals.controller.js";
@Module({
  imports: [DatabaseModule],
  exports: [TicketsApprovalsService],
  controllers: [TicketsApprovalsController],
  providers: [TicketsApprovalsRepository, TicketsApprovalsService],
})
export class TicketsApprovalsModule {}
