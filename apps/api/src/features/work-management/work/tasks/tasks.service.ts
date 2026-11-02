import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../../modules/database';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from './tasks.types';
import type { Task } from './tasks.types';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createdById: string, dto: CreateTaskDto): Promise<Task> {
    const deadlineDate = new Date(dto.deadline);
    if (deadlineDate <= new Date()) {
      throw new BadRequestException('Deadline phải là thời điểm trong tương lai.');
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        deadline: deadlineDate,
        assigneeId: dto.assigneeId,
        creatorId: createdById,
        status: TaskStatus.todo,
      },
    });

    this.logger.log(`Task created: ${task.id} by ${createdById}`);
    this.eventEmitter.emit('task.created', {
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId,
      assignedById: createdById,
      deadline: task.deadline,
    });

    return task;
  }

  async findAll(query?: { assigneeId?: string; status?: TaskStatus }): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        ...(query?.assigneeId && { assigneeId: query.assigneeId }),
        ...(query?.status && { status: query.status }),
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async findById(taskId: string): Promise<Task> {
    return this.findTaskOrThrow(taskId);
  }

  private async findTaskOrThrow(taskId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new HttpException(
        {
          errorCode: 'TSK_NOT_FOUND',
          message: 'Task không tồn tại.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return task;
  }
}
