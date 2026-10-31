import { z } from "zod";
import { TASK_STATUSES } from "../state-machine.js";

const status = z.enum(TASK_STATUSES);

export const proposedStatus = z.enum(["Hoãn lại", "Đã hủy"]);

export const transitionInput = z
  .object({
    toStatus: status,
    version: z.number().int().positive(),
    reason: z.string().trim().max(2000).optional(),
    overrideReason: z.string().trim().max(2000).optional(),
  })
  .strict();

export const proposalKind = z.enum(["HOLD", "CANCEL", "DEADLINE"]);
export const proposalStatus = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "AUTO_CLOSED",
]);

export const proposalInput = z
  .object({
    kind: proposalKind,
    reason: z.string().trim().min(5).max(2000),
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
    {
      message: "Từ chối đề xuất phải nhập lý do",
      path: ["reason"],
    },
  );

export const proposalQuery = z
  .object({
    taskId: z.uuid().optional(),
    status: proposalStatus.optional(),
    kind: proposalKind.optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const allowedQuery = z
  .object({
    taskIds: z.string().min(1).max(4000),
  })
  .strict();

export const idempotencyKey = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9:_-]+$/);

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
    kind: proposalKind,
    status: proposalStatus,
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

/** A legal move; `blockedBy` > 0 explains why starting it is currently refused. */
export const allowedMoveSchema = z
  .object({
    code: z.string(),
    to: z.string(),
    blockedBy: z.number().int().min(0),
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

export type TransitionInput = z.infer<typeof transitionInput>;
export type ProposalInput = z.infer<typeof proposalInput>;
export type DecisionInput = z.infer<typeof decisionInput>;
export type ProposalQuery = z.infer<typeof proposalQuery>;
export type TransitionDto = z.infer<typeof transitionSchema>;
export type ProposalDto = z.infer<typeof proposalSchema>;
export type AllowedEntry = z.infer<typeof allowedEntrySchema>;
export type AllowedMove = z.infer<typeof allowedMoveSchema>;
export type TaskStateDto = z.infer<typeof taskStateSchema>;
