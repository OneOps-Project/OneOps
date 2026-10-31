import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { blockersQuery, linkInput, listQuery } from "./dto/task-links.dto.js";
import { TaskLinksService } from "./task-links.service.js";

const FEATURE = "work-management/work/task-links";

@Controller("task-links")
export class TaskLinksController {
  constructor(private readonly service: TaskLinksService) {}

  @Get()
  @RequirePermission(FEATURE, "view")
  neighborhood(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.service.neighborhood(query.taskId);
  }

  @Get("blockers")
  @RequirePermission(FEATURE, "view")
  blockers(
    @Query(new SchemaPipe(blockersQuery)) query: z.infer<typeof blockersQuery>,
  ) {
    return this.service.blockers(query.taskIds);
  }

  @Post()
  @RequirePermission(FEATURE, "create")
  create(
    @Body(new SchemaPipe(linkInput)) input: z.infer<typeof linkInput>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.link(input, actor);
  }

  @Delete(":id")
  @RequirePermission(FEATURE, "delete")
  remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}
