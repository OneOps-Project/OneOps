import {
  Body,
  Controller,
  Get,
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
  summaryQuery,
  updateSchema,
} from "./dto/workforce-board.dto.js";
import { WorkforceBoardService } from "./workforce-board.service.js";

const FEATURE = "hr-management/attendance/workforce-board";

@Controller("workforce-board")
export class WorkforceBoardController {
  constructor(private readonly service: WorkforceBoardService) {}

  @Get()
  @RequirePermission(FEATURE, "view")
  list(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.list(query, actor);
  }

  @Get("summary")
  @RequirePermission(FEATURE, "view")
  summary(
    @Query(new SchemaPipe(summaryQuery)) query: z.infer<typeof summaryQuery>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.summary(query, actor);
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
}
