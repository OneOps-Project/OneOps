import { Controller, Sse, UseGuards } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import type { Observable } from "rxjs";
import { MockAuthGuard } from "../../../../../core/auth/mock-auth.guard.js";
import { OrgActorGuard } from "../guards/org-actor.guard.js";
import { OrgRealtimeService } from "../events/org-realtime.service.js";

@Controller("organization")
@UseGuards(MockAuthGuard, OrgActorGuard)
export class OrganizationRealtimeController {
  constructor(private readonly realtime: OrgRealtimeService) {}

  @Sse("events")
  stream(): Observable<MessageEvent> {
    return this.realtime.stream();
  }
}
