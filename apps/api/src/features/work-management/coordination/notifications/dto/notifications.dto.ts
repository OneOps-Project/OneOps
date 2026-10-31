import { z } from "zod";

const recipient = z.string().trim().min(1).max(150);

export const listQuery = z
  .object({
    recipient,
    unread: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    includeDeleted: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const streamQuery = z.object({ recipient }).strict();

export const readAllSchema = z.object({ recipient }).strict();

export const createSchema = z
  .object({
    recipient,
    source: z.enum(["task", "comment", "message", "meeting", "request"]),
    title: z.string().trim().min(1).max(500),
    body: z.string().trim().max(2000).default(""),
    link: z.string().trim().min(1).max(500),
    sourceId: z.uuid().nullable().default(null),
  })
  .strict();

export const recordSchema = createSchema.extend({
  id: z.uuid(),
  readAt: z.iso.datetime().nullable(),
  deletedAt: z.iso.datetime().nullable().default(null),
  createdAt: z.iso.datetime(),
});

export type RecordDto = z.infer<typeof recordSchema>;
export type CreateInput = z.input<typeof createSchema>;
export type ListQuery = z.infer<typeof listQuery>;
