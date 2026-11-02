import {
  Controller,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TaskWorkflowService } from './task-workflow.service';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { JwtAuthGuard } from '../../../../modules/platform/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../modules/platform/decorators/current-user.decorator';
import type { JwtPayload } from '../../../../modules/platform/types/identity.types';
import type { TaskTransitionResponse } from './task-workflow.types';

@Controller(['tasks', 'api/v1/tasks'])
@UseGuards(JwtAuthGuard)
export class TaskWorkflowController {
  constructor(private readonly taskWorkflowService: TaskWorkflowService) {}

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async transitionStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<TaskTransitionResponse> {
    const result = await this.taskWorkflowService.transitionStatus(id, user, dto);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }
}
