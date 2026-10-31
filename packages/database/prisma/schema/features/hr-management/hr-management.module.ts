import { Module } from "@nestjs/common";
import { AttendanceReportsModule } from "./attendance/attendance-reports/index.js";
import { CheckinExplanationsModule } from "./attendance/checkin-explanations/index.js";
import { DailyCheckinModule } from "./attendance/daily-checkin/index.js";
import { ShiftsSchedulesModule } from "./attendance/shifts-schedules/index.js";
import { WorkforceBoardModule } from "./attendance/workforce-board/index.js";
import { EmployeeDirectoryModule } from "./employees/employee-directory/index.js";
import { ResourceCapacityModule } from "./employees/resource-capacity/index.js";
import { HrCapacityWorkloadModule } from "./hr-management.capacity.module.js";
import { HrLeaveWorkflowModule } from "./hr-management.leaves.module.js";
import { LeaveApprovalsModule } from "./leaves/leave-approvals/index.js";
import { LeaveRequestsModule } from "./leaves/leave-requests/index.js";
import { DepartmentsTeamsModule } from "./organization/departments-teams/index.js";
import { PositionsGradesModule } from "./organization/positions-grades/index.js";

@Module({
  imports: [
    DepartmentsTeamsModule,
    PositionsGradesModule,
    EmployeeDirectoryModule,
    DailyCheckinModule,
    WorkforceBoardModule,
    CheckinExplanationsModule,
    ShiftsSchedulesModule,
    AttendanceReportsModule,
    LeaveRequestsModule,
    LeaveApprovalsModule,
    ResourceCapacityModule,
    HrLeaveWorkflowModule,
    HrCapacityWorkloadModule,
  ],
})
export class HrManagementModule {}
