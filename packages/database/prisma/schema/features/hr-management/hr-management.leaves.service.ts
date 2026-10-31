import { Injectable } from "@nestjs/common";
import type { ActorContext } from "../../core/auth/actor-context.js";
import {
  LeaveApprovalsService,
  type DecisionStatus,
} from "./leaves/leave-approvals/index.js";
import {
  LeaveRequestsService,
  type LeaveRequestDto,
} from "./leaves/leave-requests/index.js";

/**
 * Điều phối luồng duyệt nghỉ phép: hàng đợi lấy từ đơn nghỉ phép, kết quả
 * duyệt được lưu thành bản ghi lịch sử của chức năng duyệt nghỉ phép.
 */
@Injectable()
export class HrLeaveWorkflowService {
  constructor(
    private readonly requests: LeaveRequestsService,
    private readonly approvals: LeaveApprovalsService,
  ) {}

  queue() {
    return this.requests.pending();
  }

  async decide(
    requestId: string,
    input: { status: DecisionStatus; note: string },
    actor: ActorContext,
  ) {
    const decidedBy = actor.displayName || actor.accountId;
    const request: LeaveRequestDto = await this.requests.applyDecision(
      requestId,
      { status: input.status, decidedBy, note: input.note },
    );
    const decision = await this.approvals.record({
      requestId: request.id,
      employeeId: request.employeeId,
      employeeName: request.employeeName,
      leaveType: request.leaveType,
      fromDate: request.fromDate,
      toDate: request.toDate,
      days: request.days,
      reason: request.reason,
      status: input.status,
      decidedBy,
      decisionNote: input.note,
    });
    return { request, decision };
  }
}
