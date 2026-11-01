import { Module } from "@nestjs/common";
import { WorkspaceTodayModule } from "./coordination/workspace-today/index.js";
import { TasksModule } from "./work/tasks/index.js";
import { ProjectSpacesModule } from "./projects/project-spaces/index.js";
import { CalendarModule } from "./coordination/workspace-today/calendar/index.js";
import { TicketsApprovalsModule } from "./coordination/tickets-approvals/index.js";
import { InternalChatModule } from "./coordination/internal-chat/index.js";
import { KnowledgeSopModule } from "./coordination/knowledge-sop/index.js";
import { ReportsModule } from "./coordination/workspace-today/reports/index.js";
import { WorkspaceInsightsModule } from "./work-management.insights.module.js";
@Module({
  imports: [
    WorkspaceTodayModule,
    TasksModule,
    ProjectSpacesModule,
    CalendarModule,
    TicketsApprovalsModule,
    InternalChatModule,
    KnowledgeSopModule,
    ReportsModule,
    WorkspaceInsightsModule,
  ],
})
export class WorkManagementModule {}
