import { CreateForm as tasks } from "@/features/work-management/work/tasks/index";
import { CreateForm as projects } from "@/features/work-management/projects/project-spaces/index";
import { CreateForm as milestones } from "@/features/work-management/projects/milestones-qa/index";
import { CreateForm as timesheets } from "@/features/work-management/projects/timesheets/index";
import { CreateForm as calendar } from "@/features/work-management/coordination/workspace-today/calendar/index";
import { CreateForm as requests } from "@/features/work-management/coordination/tickets-approvals/index";
import { CreateForm as messages } from "@/features/work-management/coordination/internal-chat/index";
import { CreateForm as notes } from "@/features/work-management/coordination/knowledge-sop/index";
import { CreateForm as reports } from "@/features/work-management/coordination/workspace-today/reports/index";
import { CreateForm as organization } from "@/features/hr-management/organization/departments-teams/index";
import { CreateForm as positions } from "@/features/hr-management/organization/positions-grades/index";
import { CreateForm as employees } from "@/features/hr-management/employees/employee-directory/index";
import { CreateForm as capacity } from "@/features/hr-management/employees/resource-capacity/index";
import { CreateForm as attendance } from "@/features/hr-management/attendance/daily-checkin/index";
import { CreateForm as workforce } from "@/features/hr-management/attendance/workforce-board/index";
import { CreateForm as explanations } from "@/features/hr-management/attendance/checkin-explanations/index";
import { CreateForm as shifts } from "@/features/hr-management/attendance/shifts-schedules/index";
import { CreateForm as attendanceReports } from "@/features/hr-management/attendance/attendance-reports/index";
import { CreateForm as leaves } from "@/features/hr-management/leaves/leave-requests/index";
import { CreateForm as accounts } from "@/features/tenant-system/access-control/accounts/index";
import { CreateForm as policies } from "@/features/tenant-system/organization/work-policies/index";
export const moduleForms = {
  "work-management/tasks": tasks,
  "work-management/projects": projects,
  "work-management/milestones": milestones,
  "work-management/timesheets": timesheets,
  "work-management/calendar": calendar,
  "work-management/tickets-approvals": requests,
  "work-management/internal-chat": messages,
  "work-management/knowledge-sop": notes,
  "work-management/reports": reports,
  "hr-management/organization": organization,
  "hr-management/positions": positions,
  "hr-management/employees": employees,
  "hr-management/capacity": capacity,
  "hr-management/attendance": attendance,
  "hr-management/workforce": workforce,
  "hr-management/explanations": explanations,
  "hr-management/shifts": shifts,
  "hr-management/attendance-reports": attendanceReports,
  "hr-management/leaves": leaves,
  "tenant-system/accounts": accounts,
  "tenant-system/work-policies": policies,
};
