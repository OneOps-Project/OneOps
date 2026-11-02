import { Module } from "@nestjs/common";
import { MockAuthGuard } from "../../../../core/auth/mock-auth.guard.js";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import {
  DepartmentController,
  TeamController,
} from "./departments-teams.controller.js";
import { OrganizationRealtimeController } from "./controllers/realtime.controller.js";
import { OrgActorGuard } from "./guards/org-actor.guard.js";
import {
  DepartmentRepository,
  OrgHistoryRepository,
  TeamRepository,
} from "./departments-teams.repository.js";
import {
  DepartmentService,
  OrgHistoryService,
  TeamService,
} from "./departments-teams.service.js";
import { OrgEventListener } from "./events/org-event.listener.js";
import { OrgRealtimeService } from "./events/org-realtime.service.js";
import { MockTaskIntegrationListener } from "./events/mock-task-integration.listener.js";

@Module({
  imports: [DatabaseModule],
  controllers: [
    DepartmentController,
    TeamController,
    OrganizationRealtimeController,
  ],
  providers: [
    DepartmentRepository,
    OrgHistoryRepository,
    TeamRepository,
    DepartmentService,
    OrgHistoryService,
    TeamService,
    OrgActorGuard,
    MockAuthGuard,
    OrgEventListener,
    OrgRealtimeService,
    MockTaskIntegrationListener,
  ],
  exports: [DepartmentService, TeamService],
})
export class DepartmentsTeamsModule {}
