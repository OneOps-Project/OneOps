import {
  Body,
  Controller,
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
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  createSchema,
  decisionSchema,
  listQuery,
  updateSchema,
  versionSchema,
} from "./dto/checkin-explanations.dto.js";
import { CheckinExplanationsService } from "./checkin-explanations.service.js";

const FEATURE = "hr-management/attendance/checkin-explanations";

@Controller("checkin-explanations")
export class CheckinExplanationsController {
  constructor(private readonly service: CheckinExplanationsService) {}

  @Get()
  @RequirePermission(FEATURE, "view")
  list(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.list(query, actor);
  }

  @Post()
  @RequirePermission(FEATURE, "create")
  create(
    @Body(new SchemaPipe(createSchema)) input: z.infer<typeof createSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.create(input, actor);
  }

  @Patch(":id")
  @RequirePermission(FEATURE, "update")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateSchema)) input: z.infer<typeof updateSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.update(id, input, actor);
  }

  @Post(":id/decision")
  @HttpCode(200)
  @RequirePermission(FEATURE, "approve")
  decide(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(decisionSchema)) input: z.infer<typeof decisionSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.decide(id, input, actor);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @RequirePermission(FEATURE, "update")
  cancel(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(versionSchema)) input: z.infer<typeof versionSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.cancel(id, input, actor);
  }
}
