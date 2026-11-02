import { TaskStatus, ProposalType, ProposalStatus } from '@prisma/client';
import type { Task, TaskHistory, TaskLog, TaskProposal, TaskComment } from '@prisma/client';

export { TaskStatus, ProposalType, ProposalStatus };
export type { Task, TaskHistory, TaskLog, TaskProposal, TaskComment };

export interface TaskStatusTransitionPayload {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  actorId: string;
  reason?: string;
  newDeadline?: Date;
  previousStatus?: TaskStatus | null;
  progress?: number;
}

export type TaskStatusChangedEvent = TaskStatusTransitionPayload;

export interface TaskTransitionResponse {
  statusCode: number;
  data: {
    task: Task;
    history: TaskHistory;
  };
}

export interface TaskProposalCreatedEvent {
  proposalId: string;
  taskId: string;
  userId: string;
  type: ProposalType;
  reason: string;
}

export interface TaskProposalApprovedEvent {
  proposalId: string;
  taskId: string;
  type: ProposalType;
  reviewerId: string;
  taskStatus: TaskStatus;
}

export interface TaskProposalRejectedEvent {
  proposalId: string;
  taskId: string;
  type: ProposalType;
  reviewerId: string;
  reviewReason: string;
}

export interface TaskProposalResponse {
  proposal: TaskProposal;
}

export interface TaskProposalReviewResponse {
  proposal: TaskProposal;
  task: Task;
}
