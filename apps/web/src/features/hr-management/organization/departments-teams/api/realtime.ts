import { z } from "zod";
import {
  getMockAuthHeaders,
  subscribeMockAuthIdentity,
} from "@/features/hr-management/organization/departments-teams/api/http";

const organizationChangeSchema = z.object({
  resource: z.enum(["department", "team"]),
  action: z.enum(["created", "updated", "status_changed", "transferred"]),
  id: z.uuid(),
  departmentId: z.uuid().optional(),
});

export type OrganizationChange = z.infer<typeof organizationChangeSchema>;

const listeners = new Set<(change: OrganizationChange) => void>();
let streamController: AbortController | null = null;
let generation = 0;

function dispatch(frame: string) {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!data) return;

  const parsed = organizationChangeSchema.safeParse(JSON.parse(data));
  if (!parsed.success) {
    throw new Error("Nhận được sự kiện realtime không hợp lệ.");
  }
  for (const listener of listeners) listener(parsed.data);
}

async function consume(signal: AbortSignal, currentGeneration: number) {
  let retryDelay = 500;
  while (!signal.aborted && currentGeneration === generation) {
    try {
      const response = await fetch("/api/v1/organization/events", {
        headers: {
          Accept: "text/event-stream",
          ...getMockAuthHeaders(),
        },
        cache: "no-store",
        signal,
      });
      if (!response.ok || !response.body)
        throw new Error(`Realtime API trả về HTTP ${response.status}.`);

      retryDelay = 500;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) throw new Error("Kết nối realtime đã đóng.");
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.search(/\r?\n\r?\n/);
        while (boundary >= 0) {
          const frame = buffer.slice(0, boundary);
          const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0];
          buffer = buffer.slice(boundary + (separator?.length ?? 2));
          dispatch(frame);
          boundary = buffer.search(/\r?\n\r?\n/);
        }
      }
    } catch (error) {
      if (signal.aborted || currentGeneration !== generation) return;
      console.error("Kênh realtime bị gián đoạn; sẽ thử kết nối lại.", error);
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, retryDelay);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
      retryDelay = Math.min(retryDelay * 2, 10_000);
    }
  }
}

function restartStream() {
  generation += 1;
  streamController?.abort();
  streamController = null;
  if (listeners.size === 0) return;
  streamController = new AbortController();
  void consume(streamController.signal, generation);
}

subscribeMockAuthIdentity(() => {
  if (listeners.size > 0) restartStream();
});

export function reconnectOrganizationEvents() {
  restartStream();
}

export function subscribeOrganizationChanges(
  listener: (change: OrganizationChange) => void,
) {
  listeners.add(listener);
  if (listeners.size === 1) restartStream();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      generation += 1;
      streamController?.abort();
      streamController = null;
    }
  };
}
