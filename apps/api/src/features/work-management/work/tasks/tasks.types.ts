import { TaskStatus, ProposalType, ProposalStatus } from '@prisma/client';
import type { Task, TaskHistory, TaskLog, TaskProposal, TaskComment } from '@prisma/client';

export { TaskStatus, ProposalType, ProposalStatus };
export type { Task, TaskHistory, TaskLog, TaskProposal, TaskComment };

export interface TaskCreatedEvent {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  assignedById: string;
  deadline: Date;
}

export interface TaskOverdueEvent {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  managerId: string;
  overdueMinutes: number;
}
