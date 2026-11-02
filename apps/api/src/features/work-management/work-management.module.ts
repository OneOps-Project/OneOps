import { Module } from '@nestjs/common';
import { TasksModule } from './work/tasks/tasks.module';
import { TaskWorkflowModule } from './work/task-workflow/task-workflow.module';

@Module({
  imports: [TasksModule, TaskWorkflowModule],
  exports: [TasksModule, TaskWorkflowModule],
})
export class WorkManagementModule {}
