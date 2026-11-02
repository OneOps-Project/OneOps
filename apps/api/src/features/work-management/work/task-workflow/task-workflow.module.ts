import { Module } from '@nestjs/common';
import { TaskWorkflowService } from './task-workflow.service';
import { TaskWorkflowController } from './task-workflow.controller';
import { TaskProposalsService } from './task-proposals.service';
import { TasksGateway } from './tasks.gateway';

@Module({
  controllers: [TaskWorkflowController],
  providers: [TaskWorkflowService, TaskProposalsService, TasksGateway],
  exports: [TaskWorkflowService, TaskProposalsService],
})
export class TaskWorkflowModule {}
