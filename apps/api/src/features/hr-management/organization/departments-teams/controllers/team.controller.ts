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
  createTeamSchema,
  historyQuerySchema,
  listQuerySchema,
  previewCreateTeamTransferSchema,
  statusUpdateSchema,
  transferMemberSchema,
  updateTeamSchema,
} from "../dto/departments-teams.dto.js";
import { SchemaPipe } from "../../../../../core/pipes/validation.pipe.js";
import {
  getOrganizationActor,
  OrgActorGuard,
  type OrganizationRequest,
} from "../guards/org-actor.guard.js";
import { MockAuthGuard } from "../../../../../core/auth/mock-auth.guard.js";
import { TeamService } from "../services/team.service.js";
import { OrgRealtimeService } from "../events/org-realtime.service.js";

@Controller()
// TODO: [INTEGRATION] - Replace the local MockAuthGuard with the Auth module's JwtAuthGuard.
@UseGuards(MockAuthGuard, OrgActorGuard)
export class TeamController {
  constructor(
    private readonly service: TeamService,
    private readonly realtime: OrgRealtimeService,
  ) {}

  @Get("departments/:departmentId/teams")
  listByDepartment(
    @Param("departmentId", new ParseUUIDPipe()) departmentId: string,
    @Query(new SchemaPipe(listQuerySchema))
    query: z.infer<typeof listQuerySchema>,
    @Req() request: OrganizationRequest,
  ) {
    return this.service.listByDepartment(
      departmentId,
      query,
      getOrganizationActor(request),
    );
  }

  @Post("teams")
  async create(
    @Body(new SchemaPipe(createTeamSchema))
    input: z.infer<typeof createTeamSchema>,
    @Req() request: OrganizationRequest,
  ) {
    const team = await this.service.create(
      input,
      getOrganizationActor(request),
    );
    this.realtime.publish({
      resource: "team",
      action: "created",
      id: team.id,
      departmentId: team.departmentId,
    });
    return team;
  }

  @Post("departments/:departmentId/team-transfer-preview")
  previewCreateTransfers(
    @Param("departmentId", new ParseUUIDPipe()) departmentId: string,
    @Body(new SchemaPipe(previewCreateTeamTransferSchema))
    input: z.infer<typeof previewCreateTeamTransferSchema>,
    @Req() request: OrganizationRequest,
  ) {
    return this.service.previewCreateTransfers(
      departmentId,
      input,
      getOrganizationActor(request),
    );
  }

  @Get("teams/:id")
  get(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: OrganizationRequest,
  ) {
    return this.service.get(id, getOrganizationActor(request));
  }

  @Get("teams/:id/history")
  history(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(historyQuerySchema))
    query: z.infer<typeof historyQuerySchema>,
    @Req() request: OrganizationRequest,
  ) {
    return this.service.getHistory(id, query, getOrganizationActor(request));
  }

  @Put("teams/:id")
  async update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateTeamSchema))
    input: z.infer<typeof updateTeamSchema>,
    @Req() request: OrganizationRequest,
  ) {
    const team = await this.service.update(
      id,
      input,
      getOrganizationActor(request),
    );
    this.realtime.publish({
      resource: "team",
      action: "updated",
      id: team.id,
      departmentId: team.departmentId,
    });
    return team;
  }

  @Post("teams/:targetTeamId/transfer")
  async transfer(
    @Param("targetTeamId", new ParseUUIDPipe()) targetTeamId: string,
    @Body(new SchemaPipe(transferMemberSchema))
    input: z.infer<typeof transferMemberSchema>,
    @Req() request: OrganizationRequest,
  ) {
    const result = await this.service.transfer(
      targetTeamId,
      input,
      getOrganizationActor(request),
    );
    this.realtime.publish({
      resource: "team",
      action: "transferred",
      id: targetTeamId,
    });
    return result;
  }

  @Post("teams/:targetTeamId/transfer-preview")
  previewTransfer(
    @Param("targetTeamId", new ParseUUIDPipe()) targetTeamId: string,
    @Body(new SchemaPipe(transferMemberSchema))
    input: z.infer<typeof transferMemberSchema>,
    @Req() request: OrganizationRequest,
  ) {
    return this.service.previewTransfer(
      targetTeamId,
      input,
      getOrganizationActor(request),
    );
  }

  @Patch("teams/:id/status")
  async setStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(statusUpdateSchema))
    input: z.infer<typeof statusUpdateSchema>,
    @Req() request: OrganizationRequest,
  ) {
    const team = await this.service.setStatus(
      id,
      input.status,
      getOrganizationActor(request),
    );
    this.realtime.publish({
      resource: "team",
      action: "status_changed",
      id: team.id,
      departmentId: team.departmentId,
    });
    return team;
  }
}
