import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { OnEvent } from "@nestjs/event-emitter";
import { OrgRealtimeService } from "./org-realtime.service.js";

export const MEMBER_REMOVED_FROM_TEAM = "org.team.member_removed";

export interface MemberRemovedFromTeamEvent {
  userId: string;
  oldTeamId: string;
}

@Injectable()
export class OrgEventListener {
  constructor(
    private readonly events: EventEmitter2,
    private readonly realtime: OrgRealtimeService,
  ) {}

  emitMemberRemoved(event: MemberRemovedFromTeamEvent) {
    // TODO: [INTEGRATION] - Task Module must listen to 'org.team.member_removed' to flag tasks for reassignment (BR-ORG-09).
    this.events.emit(MEMBER_REMOVED_FROM_TEAM, event);
  }

  @OnEvent(MEMBER_REMOVED_FROM_TEAM)
  publishSourceTeamChange(event: MemberRemovedFromTeamEvent) {
    this.realtime.publish({
      resource: "team",
      action: "transferred",
      id: event.oldTeamId,
    });
  }
}
