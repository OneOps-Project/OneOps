import { Module } from '@nestjs/common';
import { TaskWorkflowService } from './task-workflow.service';
import { TaskWorkflowController } from './task-workflow.controller';
import { TasksGateway } from './tasks.gateway';

@Module({
  controllers: [TaskWorkflowController],
  providers: [TaskWorkflowService, TasksGateway],
  exports: [TaskWorkflowService],
})
export class TaskWorkflowModule {}
