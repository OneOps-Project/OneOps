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
  allocationInput,
  allocationListQuery,
  allocationPatch,
  periodInput,
  periodListQuery,
  periodPatch,
  versionSchema,
} from "./dto/resource-capacity.dto.js";
import { ResourceCapacityService } from "./resource-capacity.service.js";

const FEATURE = "hr-management/employees/resource-capacity";

@Controller("resource-capacity")
export class ResourceCapacityController {
  constructor(private readonly service: ResourceCapacityService) {}

  @Get("periods")
  @RequirePermission(FEATURE, "view")
  listPeriods(
    @Query(new SchemaPipe(periodListQuery))
    query: z.infer<typeof periodListQuery>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.listPeriods(query, actor);
  }

  @Post("periods")
  @RequirePermission(FEATURE, "create")
  createPeriod(
    @Body(new SchemaPipe(periodInput)) input: z.infer<typeof periodInput>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.createPeriod(input, actor);
  }

  @Patch("periods/:id")
  @RequirePermission(FEATURE, "update")
  updatePeriod(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(periodPatch)) input: z.infer<typeof periodPatch>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.updatePeriod(id, input, actor);
  }

  @Get("periods/:id/summary")
  @RequirePermission(FEATURE, "view")
  summary(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.summary(id);
  }

  @Get("allocations")
  @RequirePermission(FEATURE, "view")
  listAllocations(
    @Query(new SchemaPipe(allocationListQuery))
    query: z.infer<typeof allocationListQuery>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.listAllocations(query, actor);
  }

  @Post("allocations")
  @RequirePermission(FEATURE, "create")
  createAllocation(
    @Body(new SchemaPipe(allocationInput))
    input: z.infer<typeof allocationInput>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.createAllocation(input, actor);
  }

  @Patch("allocations/:id")
  @RequirePermission(FEATURE, "update")
  updateAllocation(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(allocationPatch))
    input: z.infer<typeof allocationPatch>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.updateAllocation(id, input, actor);
  }

  @Post("allocations/:id/cancel")
  @HttpCode(200)
  @RequirePermission(FEATURE, "update")
  cancelAllocation(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(versionSchema)) input: z.infer<typeof versionSchema>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.cancelAllocation(id, input, actor);
  }
}
