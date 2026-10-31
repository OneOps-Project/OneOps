import { z } from "zod";

/** Approved workflow vocabulary; the API rejects anything outside this list. */
export const TASK_STATUSES = [
  "Cần làm",
  "Đang làm",
  "Làm lại",
  "Chờ kiểm tra",
  "Hoãn lại",
  "Hoàn thành",
  "Đã hủy",
] as const;
export const taskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const INITIAL_TASK_STATUS: TaskStatus = "Cần làm";

const recordBase = z
  .object({
    code: z.string().trim().min(1, "Nhập mã công việc").max(100),
    name: z.string().trim().min(1, "Nhập tiêu đề công việc").max(500),
    scope: z.string().trim().max(250).default(""),
    date: z.iso.date("Chọn hạn hoàn thành"),
    assignee: z.string().trim().max(150).default(""),
    reviewer: z.string().trim().max(150).default(""),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();

export const fieldsSchema = z
  .object({
    project: z.string().trim().max(1000).optional(),
    priority: z.enum(["Thấp", "Trung bình", "Cao", "Khẩn cấp"]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    startDate: z.union([z.iso.date(), z.literal("")]).optional(),
    tags: z.string().trim().max(1000).optional(),
    checklist: z
      .array(
        z
          .object({
            id: z.uuid(),
            title: z.string().trim().min(1).max(500),
            done: z.boolean(),
          })
          .strict(),
      )
      .max(200)
      .optional(),
  })
  .strict();

export const createSchema = recordBase.extend({
  fields: fieldsSchema.default({}),
});

/** `status` is intentionally absent: only the workflow may move a task. */
export const updateSchema = recordBase
  .omit({ scope: true, assignee: true, reviewer: true, note: true })
  .partial()
  .extend({
    scope: z.string().trim().max(250).optional(),
    assignee: z.string().trim().max(150).optional(),
    reviewer: z.string().trim().max(150).optional(),
    note: z.string().trim().max(2000).optional(),
    fields: fieldsSchema.optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const recordSchema = createSchema.extend({
  id: z.uuid(),
  module: z.literal("tasks"),
  status: taskStatusSchema,
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const validatedCreateSchema = createSchema.refine(
  (value) => !value.fields.startDate || value.fields.startDate <= value.date,
  { message: "Hạn hoàn thành phải từ ngày bắt đầu trở đi", path: ["date"] },
);

export const transitionSchema = z
  .object({
    id: z.uuid(),
    taskId: z.uuid(),
    code: z.string(),
    fromStatus: z.string(),
    toStatus: z.string(),
    reason: z.string(),
    actorName: z.string(),
    actorRole: z.string(),
    taskVersion: z.number().int(),
    occurredAt: z.iso.datetime(),
  })
  .strict();

export const proposalSchema = z
  .object({
    id: z.uuid(),
    taskId: z.uuid(),
    kind: z.enum(["HOLD", "CANCEL", "DEADLINE"]),
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "AUTO_CLOSED"]),
    reason: z.string(),
    payload: z.record(z.string(), z.unknown()),
    requestedByName: z.string(),
    decidedByName: z.string(),
    decisionReason: z.string(),
    decidedAt: z.iso.datetime().nullable(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

/** A legal move; `blockedBy` counts the open tasks that still hold it back. */
const allowedMoveSchema = z
  .object({
    code: z.string(),
    to: z.string(),
    blockedBy: z.number().int().min(0),
  })
  .strict();

export const taskStateSchema = z
  .object({
    task: z
      .object({
        id: z.uuid(),
        code: z.string(),
        name: z.string(),
        status: z.string(),
        date: z.string(),
        assignee: z.string(),
        reviewer: z.string(),
        version: z.number().int().positive(),
      })
      .strict(),
    allowed: z.array(allowedMoveSchema),
    pendingProposal: proposalSchema.nullable(),
    restoreStatus: z.string().nullable(),
    history: z.array(transitionSchema),
  })
  .strict();

export const allowedEntrySchema = z
  .object({
    taskId: z.uuid(),
    status: z.string(),
    allowed: z.array(allowedMoveSchema),
    pendingProposal: proposalSchema.nullable(),
    restoreStatus: z.string().nullable(),
  })
  .strict();

export const allowedResponseSchema = z
  .object({ items: z.array(allowedEntrySchema) })
  .strict();

export const proposalInput = z
  .object({
    kind: z.enum(["HOLD", "CANCEL", "DEADLINE"]),
    reason: z.string().trim().min(5, "Nhập lý do ít nhất 5 ký tự").max(2000),
    newDate: z.iso.date().optional(),
  })
  .strict()
  .refine((value) => value.kind !== "DEADLINE" || Boolean(value.newDate), {
    message: "Đề xuất Deadline phải kèm ngày mới",
    path: ["newDate"],
  });

export const decisionInput = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine(
    (value) => value.decision !== "REJECT" || Boolean(value.reason?.trim()),
    { message: "Từ chối đề xuất phải nhập lý do", path: ["reason"] },
  );

export type RecordInput = z.input<typeof createSchema>;
export type RecordDto = z.infer<typeof recordSchema>;
export type ChecklistItem = NonNullable<
  z.infer<typeof fieldsSchema>["checklist"]
>[number];
/** Patch payload; the API client adds the optimistic `version` itself. */
export type TaskUpdate = Omit<z.input<typeof updateSchema>, "version">;
export type TaskState = z.infer<typeof taskStateSchema>;
export type TaskTransition = z.infer<typeof transitionSchema>;
export type AllowedEntry = z.infer<typeof allowedEntrySchema>;
/** Link types mirror the API; only `BLOCKS` gates the workflow. */
export const LINK_TYPES = ["BLOCKS", "RELATES_TO", "DUPLICATES"] as const;
export const linkTypeSchema = z.enum(LINK_TYPES);
export type LinkType = (typeof LINK_TYPES)[number];

export const taskRefSchema = z
  .object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
    status: z.string(),
    assignee: z.string(),
  })
  .strict();

const linkSchema = z
  .object({
    id: z.uuid(),
    fromTaskId: z.uuid(),
    toTaskId: z.uuid(),
    type: linkTypeSchema,
    note: z.string(),
    createdBy: z.string(),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const linkViewSchema = linkSchema
  .extend({ counterpart: taskRefSchema })
  .strict();

export const neighborhoodSchema = z
  .object({
    task: taskRefSchema,
    incoming: z.array(linkViewSchema),
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

export const blockerResponseSchema = z
  .object({ items: z.array(blockerEntrySchema) })
  .strict();

export const linkInput = z
  .object({
    fromTaskId: z.uuid(),
    toTaskId: z.uuid(),
    type: linkTypeSchema,
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type AllowedMove = z.infer<typeof allowedMoveSchema>;
export type TaskProposal = z.infer<typeof proposalSchema>;
export type ProposalInput = z.input<typeof proposalInput>;
export type DecisionInput = z.input<typeof decisionInput>;
export type TaskRef = z.infer<typeof taskRefSchema>;
export type TaskLink = z.infer<typeof linkViewSchema>;
export type TaskNeighborhood = z.infer<typeof neighborhoodSchema>;
export type BlockerEntry = z.infer<typeof blockerEntrySchema>;
export type LinkInput = z.input<typeof linkInput>;
