import { Module } from "@nestjs/common";
import { WorkspaceTodayModule } from "./coordination/workspace-today/index.js";
import { TasksModule } from "./work/tasks/index.js";
import { TaskWorkflowModule } from "./work/task-workflow/index.js";
import { TaskCommentsModule } from "./work/task-comments/index.js";
import { TaskLinksModule } from "./work/task-links/index.js";
import { MilestonesQaModule } from "./projects/milestones-qa/index.js";
import { TimesheetsModule } from "./projects/timesheets/index.js";
import { CalendarModule } from "./coordination/workspace-today/calendar/index.js";
import { TicketsApprovalsModule } from "./coordination/tickets-approvals/index.js";
import { InternalChatModule } from "./coordination/internal-chat/index.js";
import { NotificationsModule } from "./coordination/notifications/index.js";
import { KnowledgeSopModule } from "./coordination/knowledge-sop/index.js";
import { ReportsModule } from "./coordination/workspace-today/reports/index.js";
import { WorkspaceInsightsModule } from "./work-management.insights.module.js";
import { TaskAutomationHandler } from "./automation.actions.js";
import {
  QaGateComposition,
  QaTaskRefComposition,
  TaskBlockersComposition,
  TaskCommentSinkComposition,
  TaskDirectoryComposition,
  TaskSnapshotComposition,
  TaskStateComposition,
  TimesheetTaskRefComposition,
  projectSpacesModule,
} from "./work-management.composition.js";

// Declared once and imported twice: the workflow needs the comment and QA
// modules in its own injector, and this module needs them on their own.
const taskComments = TaskCommentsModule.forRoot({
  tasks: TaskSnapshotComposition,
  imports: [TasksModule],
});
const milestonesQa = MilestonesQaModule.forRoot({
  tasks: QaTaskRefComposition,
  imports: [TasksModule],
});
const timesheets = TimesheetsModule.forRoot({
  tasks: TimesheetTaskRefComposition,
  imports: [TasksModule],
});
const taskLinks = TaskLinksModule.forRoot({
  tasks: TaskDirectoryComposition,
  imports: [TasksModule],
});
const taskWorkflow = TaskWorkflowModule.forRoot({
  tasks: TaskStateComposition,
  comments: TaskCommentSinkComposition,
  qa: QaGateComposition,
  blockers: TaskBlockersComposition,
  imports: [TasksModule, taskComments, milestonesQa, taskLinks],
});

@Module({
  imports: [
    WorkspaceTodayModule,
    TasksModule,
    taskComments,
    taskLinks,
    taskWorkflow,
    projectSpacesModule,
    milestonesQa,
    timesheets,
    CalendarModule,
    TicketsApprovalsModule,
    InternalChatModule,
    NotificationsModule,
    KnowledgeSopModule,
    ReportsModule,
    WorkspaceInsightsModule,
  ],
  // Applies the actions the workflow-rules engine publishes for a task.
  providers: [TaskAutomationHandler],
})
export class WorkManagementModule {}
