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
  listQuery,
  lockSchema,
  updateSchema,
} from "./dto/daily-checkin.dto.js";
import { DailyCheckinService } from "./daily-checkin.service.js";

const FEATURE = "hr-management/attendance/daily-checkin";

@Controller("daily-checkin")
export class DailyCheckinController {
  constructor(private readonly service: DailyCheckinService) {}

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

  @Post(":id/lock")
  @HttpCode(200)
  @RequirePermission(FEATURE, "approve")
  lock(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(lockSchema)) input: z.infer<typeof lockSchema>,
  ) {
    return this.service.lock(id, input.version);
  }
}
