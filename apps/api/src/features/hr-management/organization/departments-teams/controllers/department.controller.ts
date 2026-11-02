import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import {
  createDepartmentSchema,
  historyQuerySchema,
  listQuerySchema,
  statusUpdateSchema,
  updateDepartmentSchema,
} from "../dto/departments-teams.dto.js";
import { SchemaPipe } from "../../../../../core/pipes/validation.pipe.js";
import {
  getOrganizationActor,
  OrgActorGuard,
  type OrganizationRequest,
} from "../guards/org-actor.guard.js";
import { MockAuthGuard } from "../../../../../core/auth/mock-auth.guard.js";
import { DepartmentService } from "../services/department.service.js";
import { OrgRealtimeService } from "../events/org-realtime.service.js";

@Controller("departments")
// TODO: [INTEGRATION] - Replace the local MockAuthGuard with the Auth module's JwtAuthGuard.
@UseGuards(MockAuthGuard, OrgActorGuard)
export class DepartmentController {
  constructor(
    private readonly service: DepartmentService,
    private readonly realtime: OrgRealtimeService,
  ) {}

  @Get()
  list(
    @Query(new SchemaPipe(listQuerySchema))
    query: z.infer<typeof listQuerySchema>,
    @Req() request: OrganizationRequest,
  ) {
    return this.service.list(query, getOrganizationActor(request));
  }

  @Post()
  async create(
    @Body(new SchemaPipe(createDepartmentSchema))
    input: z.infer<typeof createDepartmentSchema>,
    @Req() request: OrganizationRequest,
  ) {
    const department = await this.service.create(
      input,
      getOrganizationActor(request),
    );
    this.realtime.publish({
      resource: "department",
      action: "created",
      id: department.id,
    });
    return department;
  }

  @Get(":id")
  get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: OrganizationRequest,
  ) {
    return this.service.get(id, getOrganizationActor(request));
  }

  @Get(":id/history")
  history(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(historyQuerySchema))
    query: z.infer<typeof historyQuerySchema>,
    @Req() request: OrganizationRequest,
  ) {
    return this.service.getHistory(id, query, getOrganizationActor(request));
  }

  @Put(":id")
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateDepartmentSchema))
    input: z.infer<typeof updateDepartmentSchema>,
    @Req() request: OrganizationRequest,
  ) {
    const department = await this.service.update(
      id,
      input,
      getOrganizationActor(request),
    );
    this.realtime.publish({
      resource: "department",
      action: "updated",
      id: department.id,
    });
    return department;
  }

  @Patch(":id/status")
  async setStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(statusUpdateSchema))
    input: z.infer<typeof statusUpdateSchema>,
    @Req() request: OrganizationRequest,
  ) {
    const department = await this.service.setStatus(
      id,
      input.status,
      getOrganizationActor(request),
    );
    this.realtime.publish({
      resource: "department",
      action: "status_changed",
      id: department.id,
    });
    return department;
  }
}
