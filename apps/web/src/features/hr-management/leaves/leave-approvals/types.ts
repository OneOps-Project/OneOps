import { z } from "zod";

export const decisionStatusSchema = z.enum(["APPROVED", "REJECTED"]);
export const leaveTypeSchema = z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]);

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

export const decisionInput = z
  .object({
    status: decisionStatusSchema,
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const queueItemSchema = z
  .object({
    id: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    leaveType: leaveTypeSchema,
    fromDate: dateKey,
    toDate: dateKey,
    days: z.number(),
    reason: z.string(),
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]),
    decidedBy: z.string(),
    decidedAt: z.iso.datetime().nullable(),
    decisionNote: z.string(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const queueSchema = z.array(queueItemSchema);

export const decisionSchema = z
  .object({
    id: z.uuid(),
    requestId: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    leaveType: leaveTypeSchema,
    fromDate: z.string(),
    toDate: z.string(),
    days: z.number(),
    reason: z.string(),
    status: decisionStatusSchema,
    decidedBy: z.string(),
    decisionNote: z.string(),
    decidedAt: z.iso.datetime(),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const decisionResultSchema = z.object({
  request: queueItemSchema,
  decision: decisionSchema,
});

export const historySchema = z.object({
  items: z.array(decisionSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type DecisionStatus = z.infer<typeof decisionStatusSchema>;
export type LeaveType = z.infer<typeof leaveTypeSchema>;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type DecisionDto = z.infer<typeof decisionSchema>;
