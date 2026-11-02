import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TaskWorkflowService } from './task-workflow.service';
import {
  UpdateTaskStatusDto,
  CreateTaskProposalDto,
  RejectTaskProposalDto,
} from './dto';
import { JwtAuthGuard } from '../../../../modules/platform/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../modules/platform/decorators/current-user.decorator';
import type { JwtPayload } from '../../../../modules/platform/types/identity.types';
import type {
  TaskTransitionResponse,
  TaskProposalResponse,
  TaskProposalReviewResponse,
} from './task-workflow.types';

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

  @Post(':id/proposals')
  @HttpCode(HttpStatus.CREATED)
  async createProposal(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskProposalDto,
  ): Promise<TaskProposalResponse> {
    return this.taskWorkflowService.createProposal(id, user, dto);
  }

  @Patch(':id/proposals/:proposalId/approve')
  @HttpCode(HttpStatus.OK)
  async approveProposal(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskProposalReviewResponse> {
    return this.taskWorkflowService.approveProposal(id, proposalId, user);
  }

  @Patch(':id/proposals/:proposalId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectProposal(
    @Param('id') id: string,
    @Param('proposalId') proposalId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectTaskProposalDto,
  ): Promise<TaskProposalReviewResponse> {
    return this.taskWorkflowService.rejectProposal(id, proposalId, user, dto);
  }
}
