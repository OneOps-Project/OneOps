import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import type { z } from "zod";
import {
  CurrentActor,
  RequirePermission,
  type ActorContext,
} from "../../../../core/auth/actor-context.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  activateSprintSchema,
  addItemSchema,
  closeSprintSchema,
  createSprintSchema,
  moveItemSchema,
  updateItemSchema,
  updateSprintSchema,
} from "./dto/sprints.dto.js";
import { versionSchema } from "./dto/project-spaces.dto.js";
import { SprintService } from "./sprint.service.js";

const FEATURE = "work-management/projects/project-spaces";

/** Planning surface of a project: sprints, backlog ranking and carryover. */
@Controller("projects")
export class SprintController {
  constructor(private readonly service: SprintService) {}

  @Get(":projectId/board")
  @RequirePermission(FEATURE, "view")
  board(@Param("projectId", new ParseUUIDPipe()) projectId: string) {
    return this.service.board(projectId);
  }

  @Get(":projectId/metrics")
  @RequirePermission(FEATURE, "view")
  metrics(@Param("projectId", new ParseUUIDPipe()) projectId: string) {
    return this.service.metrics(projectId);
  }

  @Post(":projectId/sprints")
  @RequirePermission(FEATURE, "create")
  createSprint(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body(new SchemaPipe(createSprintSchema))
    input: z.infer<typeof createSprintSchema>,
  ) {
    return this.service.createSprint(projectId, input);
  }

  @Patch(":projectId/sprints/:id")
  @RequirePermission(FEATURE, "update")
  updateSprint(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateSprintSchema))
    input: z.infer<typeof updateSprintSchema>,
  ) {
    return this.service.updateSprint(projectId, id, input);
  }

  @Post(":projectId/sprints/:id/activate")
  @RequirePermission(FEATURE, "update")
  activate(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(activateSprintSchema))
    input: z.infer<typeof activateSprintSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.activate(projectId, id, input, actor);
  }

  @Post(":projectId/sprints/:id/close")
  @RequirePermission(FEATURE, "update")
  close(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(closeSprintSchema))
    input: z.infer<typeof closeSprintSchema>,
  ) {
    return this.service.close(projectId, id, input);
  }

  @Post(":projectId/items")
  @RequirePermission(FEATURE, "update")
  addItem(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body(new SchemaPipe(addItemSchema))
    input: z.infer<typeof addItemSchema>,
  ) {
    return this.service.addItem(projectId, input);
  }

  @Patch(":projectId/items/:itemId")
  @RequirePermission(FEATURE, "update")
  updateItem(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("itemId", new ParseUUIDPipe()) itemId: string,
    @Body(new SchemaPipe(updateItemSchema))
    input: z.infer<typeof updateItemSchema>,
  ) {
    return this.service.updateItem(projectId, itemId, input);
  }

  @Post(":projectId/items/:itemId/move")
  @RequirePermission(FEATURE, "update")
  moveItem(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("itemId", new ParseUUIDPipe()) itemId: string,
    @Body(new SchemaPipe(moveItemSchema))
    input: z.infer<typeof moveItemSchema>,
  ) {
    return this.service.moveItem(projectId, itemId, input);
  }

  @Delete(":projectId/items/:itemId")
  @RequirePermission(FEATURE, "update")
  removeItem(
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("itemId", new ParseUUIDPipe()) itemId: string,
    @Body(new SchemaPipe(versionSchema))
    input: z.infer<typeof versionSchema>,
  ) {
    return this.service.removeItem(projectId, itemId, input.version);
  }
}
