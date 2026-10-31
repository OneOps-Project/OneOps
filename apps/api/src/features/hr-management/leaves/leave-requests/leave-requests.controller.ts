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
  updateSchema,
  versionSchema,
} from "./dto/leave-requests.dto.js";
import { LeaveRequestsService } from "./leave-requests.service.js";

const FEATURE = "hr-management/leaves/leave-requests";

@Controller("leave-requests")
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

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
