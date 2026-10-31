import { z } from "zod";
const recordInput = z
  .object({
    code: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(500),
    scope: z.string().trim().max(250).default(""),
    status: z.enum(["Chờ duyệt", "Đã duyệt", "Từ chối", "Đã hủy"]),
    date: z.iso.date(),
    assignee: z.string().trim().max(150).default(""),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
const recordPatch = recordInput
  .omit({ scope: true, assignee: true, note: true })
  .partial()
  .extend({
    scope: z.string().trim().max(250).optional(),
    assignee: z.string().trim().max(150).optional(),
    note: z.string().trim().max(2000).optional(),
  });
export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
    q: z.string().trim().max(500).optional(),
    scope: z.string().max(250).optional(),
    status: z.string().max(150).optional(),
    assignee: z.string().trim().max(150).optional(),
  })
  .strict();
export const versionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export const fieldsSchema = z
  .object({
    category: z.enum(["Mua sắm", "Nghỉ phép", "Thanh toán", "Khác"]).optional(),
    requester: z.string().trim().max(1000).optional(),
    amount: z.number().int().min(0).max(1000000000000).optional(),
  })
  .strict();
export const createSchema = recordInput.extend({
  fields: fieldsSchema.default({}),
});
export const updateSchema = recordPatch
  .extend({
    fields: fieldsSchema.optional(),
    version: z.number().int().positive(),
  })
  .strict();
export const recordSchema = createSchema.extend({
  id: z.uuid(),
  module: z.literal("requests"),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type RecordInput = z.input<typeof createSchema>;
export type RecordOutput = z.infer<typeof recordSchema>;
export type RecordDto = RecordOutput;
export type ListQuery = z.infer<typeof listQuery>;

export const quorumSchema = z.enum(["ANY", "ALL", "MAJORITY"]);
export const stepStatusSchema = z.enum([
  "WAITING",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SKIPPED",
]);
export const voteSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const slaSchema = z.enum(["ON_TRACK", "DUE_SOON", "OVERDUE"]);

const approverSchema = z.object({
  id: z.uuid(),
  approver: z.string(),
  displayName: z.string(),
  decision: voteSchema,
  comment: z.string(),
  decidedAt: z.iso.datetime().nullable(),
});
export const approvalStepSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  name: z.string(),
  quorum: quorumSchema,
  status: stepStatusSchema,
  slaHours: z.number().int(),
  startedAt: z.iso.datetime(),
  dueAt: z.iso.datetime(),
  decidedAt: z.iso.datetime().nullable(),
  decidedBy: z.string(),
  escalatedAt: z.iso.datetime().nullable(),
  note: z.string(),
  sla: slaSchema,
  remainingMinutes: z.number().int(),
  approvers: z.array(approverSchema),
});
export const approvalChainSchema = z.object({
  requestId: z.uuid(),
  status: recordSchema.shape.status,
  activeStepId: z.uuid().nullable(),
  nextDueAt: z.iso.datetime().nullable(),
  canDecide: z.boolean(),
  canManage: z.boolean(),
  canCancel: z.boolean(),
  steps: z.array(approvalStepSchema),
});
export const decisionResultSchema = z.object({
  request: recordSchema,
  chain: approvalChainSchema,
});
export const inboxEntrySchema = z.object({
  request: recordSchema,
  step: approvalStepSchema,
});
export const inboxPageSchema = z.object({
  items: z.array(inboxEntrySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type Quorum = z.infer<typeof quorumSchema>;
export type SlaState = z.infer<typeof slaSchema>;
export type ApprovalStep = z.infer<typeof approvalStepSchema>;
export type ApprovalChain = z.infer<typeof approvalChainSchema>;
export type DecisionResult = z.infer<typeof decisionResultSchema>;
export type InboxEntry = z.infer<typeof inboxEntrySchema>;
