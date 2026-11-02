// TODO: [INTEGRATION] - DELETE THIS ENTIRE FILE once the real Task Module is implemented. This is just to mock the event consumption.
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  MEMBER_REMOVED_FROM_TEAM,
  type MemberRemovedFromTeamEvent,
} from "./org-event.listener.js";

@Injectable()
export class MockTaskIntegrationListener {
  @OnEvent(MEMBER_REMOVED_FROM_TEAM)
  handleMemberRemoved(event: MemberRemovedFromTeamEvent) {
    console.log(
      `[MOCK TASK MODULE] Received member_removed event. Flagging tasks for user ${event.userId} in team ${event.oldTeamId} to "Cần giao lại".`,
    );
  }
}
