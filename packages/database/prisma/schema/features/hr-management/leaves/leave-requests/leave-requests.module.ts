import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { LeaveRequestsController } from "./leave-requests.controller.js";
import { LeaveRequestsRepository } from "./leave-requests.repository.js";
import { LeaveRequestsService } from "./leave-requests.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsRepository, LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
