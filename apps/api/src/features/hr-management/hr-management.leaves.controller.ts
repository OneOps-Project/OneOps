import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { z } from "zod";
import {
  CurrentActor,
  RequirePermission,
  type ActorContext,
} from "../../core/auth/actor-context.js";
import { SchemaPipe } from "../../core/pipes/validation.pipe.js";
import { HrLeaveWorkflowService } from "./hr-management.leaves.service.js";

const FEATURE = "hr-management/leaves/leave-approvals";

const decisionBody = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

@Controller("leaves/workflow")
export class HrLeaveWorkflowController {
  constructor(private readonly service: HrLeaveWorkflowService) {}

  @Get("queue")
  @RequirePermission(FEATURE, "view")
  queue() {
    return this.service.queue();
  }

  @Post("queue/:requestId/decision")
  @HttpCode(200)
  @RequirePermission(FEATURE, "approve")
  decide(
    @Param("requestId", new ParseUUIDPipe()) requestId: string,
    @Body(new SchemaPipe(decisionBody)) input: z.infer<typeof decisionBody>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.decide(requestId, input, actor);
  }
}
