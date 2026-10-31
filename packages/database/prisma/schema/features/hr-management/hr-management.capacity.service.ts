import { Injectable } from "@nestjs/common";
import { ResourceCapacityService } from "./employees/resource-capacity/index.js";
import { LeaveRequestsService } from "./leaves/leave-requests/index.js";

/**
 * Ghép công suất của một kỳ với số ngày nghỉ phép đã duyệt. Công suất vẫn do
 * chức năng resource-capacity tính; composition chỉ cung cấp dữ liệu phép.
 */
@Injectable()
export class HrCapacityWorkloadService {
  constructor(
    private readonly capacity: ResourceCapacityService,
    private readonly leaves: LeaveRequestsService,
  ) {}

  async workload(periodId: string) {
    const period = await this.capacity.get(periodId);
    const leaveDays = await this.leaves.approvedDays(
      period.employeeId,
      period.fromDate,
      period.toDate,
    );
    return this.capacity.summary(periodId, leaveDays);
  }
}
