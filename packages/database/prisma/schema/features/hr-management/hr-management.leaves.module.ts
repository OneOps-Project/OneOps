import { Module } from "@nestjs/common";
import { HrLeaveWorkflowController } from "./hr-management.leaves.controller.js";
import { HrLeaveWorkflowService } from "./hr-management.leaves.service.js";
import { LeaveApprovalsModule } from "./leaves/leave-approvals/index.js";
import { LeaveRequestsModule } from "./leaves/leave-requests/index.js";

@Module({
  imports: [LeaveRequestsModule, LeaveApprovalsModule],
  controllers: [HrLeaveWorkflowController],
  providers: [HrLeaveWorkflowService],
})
export class HrLeaveWorkflowModule {}
