import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";

export type NotificationSource =
  "task" | "comment" | "message" | "meeting" | "request";

export interface NotificationEvent {
  source: NotificationSource;
  recipients: string[];
  title: string;
  body: string;
  link: string;
  sourceId: string;
}

export interface NotificationDeleteEvent {
  sourceId: string;
  source?: NotificationSource;
}

export function parseRecipients(...values: string[]) {
  return [
    ...new Set(
      values
        .flatMap((value) => value.split(/[,;\n]/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

// shortcut: in-process fan-out; use a shared broker when the API runs multiple instances.
@Injectable()
export class NotificationEvents {
  private readonly events = new Subject<NotificationEvent>();
  private readonly deleteEvents = new Subject<NotificationDeleteEvent>();

  emit(event: NotificationEvent) {
    this.events.next(event);
  }

  emitDeletion(event: NotificationDeleteEvent) {
    this.deleteEvents.next(event);
  }

  subscribe(handler: (event: NotificationEvent) => void) {
    return this.events.subscribe(handler);
  }

  subscribeDeletion(handler: (event: NotificationDeleteEvent) => void) {
    return this.deleteEvents.subscribe(handler);
  }
}
