import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";

/**
 * Domain events the automation engine listens to. A business feature only
 * publishes a snapshot of its own record; the rules, their conditions and the
 * actions live in `tenant-system/automation-hub/workflow-rules`, so no feature
 * imports another one. The engine publishes the compiled actions back on the
 * same bus and the owning feature applies them.
 */
export const WORKFLOW_FIELDS = [
  "status",
  "assignee",
  "reviewer",
  "scope",
  "code",
  "name",
  "date",
] as const;

export type WorkflowField = (typeof WORKFLOW_FIELDS)[number];
export type WorkflowEntity = "task";

export interface WorkflowSnapshot {
  entity: WorkflowEntity;
  id: string;
  code: string;
  name: string;
  status: string;
  assignee: string;
  reviewer: string;
  scope: string;
  date: string;
  /** Absent on creation; present on any later change. */
  previous?: Partial<Record<WorkflowField, string>>;
}

export type WorkflowAction =
  | { kind: "assign"; entityId: string; assignee: string }
  | { kind: "status"; entityId: string; status: string }
  | { kind: "comment"; entityId: string; body: string }
  | {
      kind: "notify";
      entityId: string;
      recipients: string[];
      title: string;
      body: string;
    };

export interface WorkflowActionEvent {
  runId: string;
  rule: string;
  entity: WorkflowEntity;
  entityId: string;
  code: string;
  actions: WorkflowAction[];
}

// shortcut: in-process fan-out; a shared broker is needed when the API runs
// multiple instances, exactly like the notification bus above.
@Injectable()
export class WorkflowEvents {
  private readonly triggers = new Subject<WorkflowSnapshot>();
  private readonly actions = new Subject<WorkflowActionEvent>();

  emitTrigger(snapshot: WorkflowSnapshot) {
    this.triggers.next(snapshot);
  }

  subscribeTriggers(handler: (snapshot: WorkflowSnapshot) => void) {
    return this.triggers.subscribe(handler);
  }

  emitActions(event: WorkflowActionEvent) {
    this.actions.next(event);
  }

  subscribeActions(handler: (event: WorkflowActionEvent) => void) {
    return this.actions.subscribe(handler);
  }
}
