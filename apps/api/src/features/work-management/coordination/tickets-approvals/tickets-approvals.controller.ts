import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import {
  CurrentActor,
  RequirePermission,
  type ActorContext,
} from "../../../../core/auth/actor-context.js";
import { createSchema, updateSchema } from "./dto/tickets-approvals.dto.js";
import {
  cancelInput,
  decisionInput,
  inboxQuery,
  listQuery,
  reassignInput,
  versionSchema,
} from "./dto/tickets-approvals.dto.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { TicketsApprovalsService } from "./tickets-approvals.service.js";

const FEATURE = "work-management/coordination/tickets-approvals";

@Controller("requests")
export class TicketsApprovalsController {
  constructor(private readonly service: TicketsApprovalsService) {}

  @Get() list(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.service.list(query);
  }

  /** Declared before `:id` so the literal segment wins. */
  @Get("inbox")
  inbox(
    @Query(new SchemaPipe(inboxQuery)) query: z.infer<typeof inboxQuery>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.inbox(query, actor);
  }

  @Post() create(
    @Body(new SchemaPipe(createSchema)) input: z.infer<typeof createSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.create(input, actor);
  }

  @Get(":id") get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.get(id);
  }

  @Get(":id/approval")
  approval(
    @Param("id", new ParseUUIDPipe()) id: string,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.approval(id, actor);
  }

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateSchema)) input: z.infer<typeof updateSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.update(id, input, actor);
  }

  /** Approval is the only status writer; the matrix grants it explicitly. */
  @Post(":id/decision")
  @HttpCode(200)
  @RequirePermission(FEATURE, "approve")
  decide(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(decisionInput)) input: z.infer<typeof decisionInput>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.decide(id, input, actor);
  }

  @Post(":id/reassign")
  @HttpCode(200)
  @RequirePermission(FEATURE, "approve")
  reassign(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(reassignInput)) input: z.infer<typeof reassignInput>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.reassign(id, input, actor);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  cancel(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(cancelInput)) input: z.infer<typeof cancelInput>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.cancel(id, input, actor);
  }

  @Delete(":id") remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(versionSchema)) input: z.infer<typeof versionSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.remove(id, input.version, actor);
  }
}
