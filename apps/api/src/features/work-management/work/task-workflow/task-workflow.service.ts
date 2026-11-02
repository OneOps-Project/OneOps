import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../modules/database';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskStateMachine } from './task-state.machine';
import { TaskStatus } from './task-workflow.types';
import { TASK_ERROR_CODES, TASK_EVENT_STATUS_CHANGED } from './task-workflow.constants';
import type { Task, TaskHistory, TaskStatusTransitionPayload } from './task-workflow.types';
import type { JwtPayload, UserRole } from '../../../../modules/platform/types/identity.types';

@Injectable()
export class TaskWorkflowService {
  private readonly logger = new Logger(TaskWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async transitionStatus(
    taskId: string,
    actor: JwtPayload,
    dto: UpdateTaskStatusDto,
  ): Promise<{ task: Task; history: TaskHistory }> {
    const task = await this.findTaskOrThrow(taskId);

    TaskStateMachine.validate(
      task,
      dto.toStatus,
      { id: actor.sub, role: actor.role },
      dto.reason,
      dto.newDeadline,
    );

    const updates = TaskStateMachine.computeTransitionUpdates(
      task.status,
      dto.toStatus,
      dto.newDeadline,
    );

    const result = await this.executeTransitionTransaction(task, actor.sub, updates, dto);
    this.emitStatusChangedEvent(result.task, task.status, actor.sub, dto.reason);

    this.logger.log(`Task ${taskId} transitioned: ${task.status} -> ${dto.toStatus} by ${actor.sub}`);
    return result;
  }

  async updateStatus(
    taskId: string,
    newStatus: TaskStatus,
    userId: string,
    role: UserRole,
    reason?: string,
  ): Promise<Task> {
    const result = await this.transitionStatus(
      taskId,
      { sub: userId, role, email: '' },
      { toStatus: newStatus, reason },
    );
    return result.task;
  }

  private async findTaskOrThrow(taskId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new HttpException(
        {
          errorCode: TASK_ERROR_CODES.TSK_NOT_FOUND,
          message: 'Task không tồn tại.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return task;
  }

  private async executeTransitionTransaction(
    currentTask: Task,
    actorId: string,
    updates: { status: TaskStatus; progress?: number; previousStatus?: TaskStatus; deadline?: Date },
    dto: UpdateTaskStatusDto,
  ): Promise<{ task: Task; history: TaskHistory }> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: currentTask.id },
        data: updates,
      });

      const history = await tx.taskHistory.create({
        data: {
          taskId: currentTask.id,
          actorId,
          type: 'STATUS_CHANGE',
          oldValue: currentTask.status,
          newValue: dto.toStatus,
          reason: dto.reason ?? null,
        },
      });

      return { task, history };
    });
  }

  private emitStatusChangedEvent(
    updatedTask: Task,
    fromStatus: TaskStatus,
    actorId: string,
    reason?: string,
  ): void {
    const payload: TaskStatusTransitionPayload = {
      taskId: updatedTask.id,
      fromStatus,
      toStatus: updatedTask.status,
      actorId,
      reason,
      newDeadline: updatedTask.deadline,
      previousStatus: updatedTask.previousStatus,
      progress: updatedTask.progress,
    };
    this.eventEmitter.emit(TASK_EVENT_STATUS_CHANGED, payload);
  }
}
