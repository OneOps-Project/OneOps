import { z } from "zod";

/** Only `BLOCKS` edges gate the workflow; the other types are documentation. */
export const LINK_TYPES = ["BLOCKS", "RELATES_TO", "DUPLICATES"] as const;
export const linkType = z.enum(LINK_TYPES);

export const linkInput = z
  .object({
    fromTaskId: z.uuid(),
    toTaskId: z.uuid(),
    type: linkType,
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const listQuery = z.object({ taskId: z.uuid() }).strict();

export const blockersQuery = z
  .object({ taskIds: z.string().min(1).max(4000) })
  .strict();

export const taskRefSchema = z
  .object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    status: z.string(),
    assignee: z.string(),
  })
  .strict();

export const linkSchema = z
  .object({
    id: z.uuid(),
    fromTaskId: z.uuid(),
    toTaskId: z.uuid(),
    type: linkType,
    note: z.string(),
    createdBy: z.string(),
    createdAt: z.iso.datetime(),
  })
  .strict();

/** A link rendered from one task's side, with the other end resolved. */
export const linkViewSchema = linkSchema
  .extend({ counterpart: taskRefSchema })
  .strict();

export const neighborhoodSchema = z
  .object({
    task: taskRefSchema,
    /** Links that point at this task. */
    incoming: z.array(linkViewSchema),
    /** Links this task points at. */
    outgoing: z.array(linkViewSchema),
  })
  .strict();

export const blockerEntrySchema = z
  .object({
    taskId: z.uuid(),
    total: z.number().int(),
    open: z.number().int(),
    codes: z.array(z.string()),
  })
  .strict();

export type LinkInput = z.infer<typeof linkInput>;
export type LinkDto = z.infer<typeof linkSchema>;
export type LinkView = z.infer<typeof linkViewSchema>;
export type Neighborhood = z.infer<typeof neighborhoodSchema>;
export type BlockerEntry = z.infer<typeof blockerEntrySchema>;
