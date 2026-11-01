import { CreateForm as tasks } from "@/features/work-management/work/tasks/index";
import { CreateForm as projects } from "@/features/work-management/projects/project-spaces/index";
import { CreateForm as calendar } from "@/features/work-management/coordination/workspace-today/calendar/index";
import { CreateForm as requests } from "@/features/work-management/coordination/tickets-approvals/index";
import { CreateForm as messages } from "@/features/work-management/coordination/internal-chat/index";
import { CreateForm as notes } from "@/features/work-management/coordination/knowledge-sop/index";
import { CreateForm as reports } from "@/features/work-management/coordination/workspace-today/reports/index";
import { CreateForm as departmentsTeams } from "@/features/hr-management/organization/departments-teams/index";
export const moduleForms = {
  "work-management/tasks": tasks,
  "work-management/projects": projects,
  "work-management/calendar": calendar,
  "work-management/tickets-approvals": requests,
  "work-management/internal-chat": messages,
  "work-management/knowledge-sop": notes,
  "work-management/reports": reports,
  "hr-management/organization/departments": departmentsTeams,
};
