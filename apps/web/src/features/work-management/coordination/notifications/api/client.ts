import { z } from "zod";
import { apiRequest } from "./http";

const recordSchema = z.object({
  id: z.uuid(),
  recipient: z.string(),
  source: z.enum(["task", "comment", "message", "meeting", "request"]),
  title: z.string(),
  body: z.string(),
  link: z.string(),
  sourceId: z.uuid().nullable(),
  readAt: z.iso.datetime().nullable(),
  deletedAt: z.iso.datetime().nullable().default(null),
  createdAt: z.iso.datetime(),
});

const listSchema = z.object({
  items: z.array(recordSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  unread: z.number(),
});

export const client = {
  async list(recipient: string, unread?: boolean, signal?: AbortSignal) {
    const params = new URLSearchParams({ recipient });
    if (unread !== undefined) params.set("unread", unread ? "true" : "false");
    return apiRequest(
      "/notifications?" + params.toString(),
      { signal },
      listSchema,
    );
  },
  markRead(id: string) {
    return apiRequest(
      "/notifications/" + id + "/read",
      { method: "PATCH" },
      recordSchema,
    );
  },
  markAllRead(recipient: string) {
    return apiRequest(
      "/notifications/read-all",
      { method: "PATCH", body: JSON.stringify({ recipient }) },
      z.object({ updated: z.number() }),
    );
  },
  remove(id: string) {
    return apiRequest(
      "/notifications/" + id,
      { method: "DELETE" },
      recordSchema,
    );
  },
};
