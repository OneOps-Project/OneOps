export { TaskWorkflowModule } from "./task-workflow.module.js";
export { TaskWorkflowService } from "./task-workflow.service.js";
export { TASK_STATE } from "./task-state.port.js";
export type { TaskStatePort, TaskStateSnapshot } from "./task-state.port.js";
export { TASK_COMMENT_SINK } from "./comment-sink.port.js";
export type { TaskCommentSinkPort } from "./comment-sink.port.js";
export { QA_GATE } from "./qa-gate.port.js";
export type { QaGatePort, QaGateStatus } from "./qa-gate.port.js";
export { TASK_BLOCKERS } from "./blocker.port.js";
export type { BlockerRef, TaskBlockersPort } from "./blocker.port.js";
export {
  TASK_STATUSES,
  TERMINAL_STATUSES,
  TRANSITIONS,
  WARNING_STATUSES,
  carriesDeadlineWarning,
  isTerminal,
  officeToday,
} from "./state-machine.js";
export type { TaskStatus, TransitionRule } from "./state-machine.js";
