import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Subject, map } from "rxjs";
import type { MessageEvent } from "@nestjs/common";

export type OrganizationChange = {
  resource: "department" | "team";
  action: "created" | "updated" | "status_changed" | "transferred";
  id: string;
  departmentId?: string;
};

const ORGANIZATION_CHANGED = "org.changed";

@Injectable()
export class OrgRealtimeService {
  private readonly changes = new Subject<OrganizationChange>();

  constructor(private readonly events: EventEmitter2) {}

  publish(change: OrganizationChange) {
    this.changes.next(change);
    this.events.emit(ORGANIZATION_CHANGED, change);
  }

  stream() {
    return this.changes.asObservable().pipe(
      map((data): MessageEvent => ({
        type: ORGANIZATION_CHANGED,
        data,
      })),
    );
  }
}
