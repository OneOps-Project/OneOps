import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import {
  NotificationEvents,
  parseRecipients,
} from "../../core/events/notification-events.js";
import {
  WorkflowEvents,
  type WorkflowAction,
  type WorkflowActionEvent,
} from "../../core/events/workflow-events.js";
import { TaskCommentsService } from "./work/task-comments/index.js";
import { TasksService, taskStatusSchema } from "./work/tasks/index.js";
import {
  TRANSITIONS,
  carriesDeadlineWarning,
  officeToday,
} from "./work/task-workflow/index.js";

/**
 * Applies the actions the automation engine published for a task. The engine
 * owns the rules; this composition owns the write path, so no feature imports
 * the other and the task rules (transitions, versions, notifications) stay in
 * one place.
 */
@Injectable()
export class TaskAutomationHandler implements OnModuleInit {
  private readonly logger = new Logger(TaskAutomationHandler.name);

  constructor(
    private readonly tasks: TasksService,
    private readonly comments: TaskCommentsService,
    private readonly notifications: NotificationEvents,
    private readonly events: WorkflowEvents,
  ) {}

  onModuleInit() {
    this.events.subscribeActions((event) => {
      void this.apply(event).catch((error: unknown) => {
        this.logger.error(
          `Không áp dụng được tự động hóa “${event.rule}”`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    });
  }

  private async apply(event: WorkflowActionEvent) {
    for (const action of event.actions) await this.one(action);
  }

  private async one(action: WorkflowAction) {
    switch (action.kind) {
      case "assign": {
        const task = await this.tasks.get(action.entityId);
        if (task.assignee === action.assignee) return;
        await this.tasks.update(action.entityId, {
          assignee: action.assignee,
          version: task.version,
        });
        return;
      }
      case "status": {
        const task = await this.tasks.get(action.entityId);
        const status = taskStatusSchema.parse(action.status);
        if (task.status === status) return;
        // The automation is a system actor, not a free pass: it may only walk
        // an edge the state machine declares, and it still honours the deadline
        // gate that keeps a late task from resuming on its own.
        const legal = TRANSITIONS.some(
          (rule) =>
            rule.from.some((from) => from === task.status) &&
            rule.to === status,
        );
        if (!legal)
          throw new Error(
            `Bỏ qua bước chuyển không hợp lệ: ${task.status} → ${status}.`,
          );
        if (carriesDeadlineWarning(status) && task.date < officeToday())
          throw new Error(
            `Công việc ${task.code} đã quá hạn nên không thể tự chuyển sang ${status}.`,
          );
        await this.tasks.applyStatus(action.entityId, status, task.version);
        return;
      }
      case "comment": {
        await this.comments.record({
          taskId: action.entityId,
          author: "Tự động hóa",
          body: action.body,
        });
        return;
      }
      case "notify": {
        const recipients = parseRecipients(...action.recipients);
        if (!recipients.length) return;
        this.notifications.emit({
          source: "task",
          recipients,
          title: action.title.slice(0, 500),
          body: action.body.slice(0, 2000),
          link: `/work-management/tasks?focus=${action.entityId}`,
          sourceId: action.entityId,
        });
        return;
      }
    }
  }
}
