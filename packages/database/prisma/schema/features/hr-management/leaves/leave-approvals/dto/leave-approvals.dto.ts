import { z } from "zod";

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

export const decisionStatusSchema = z.enum(["APPROVED", "REJECTED"]);
export const leaveTypeSchema = z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]);

export const snapshotSchema = z
  .object({
    requestId: z.uuid(),
    employeeId: z.string().trim().min(1).max(64),
    employeeName: z.string().trim().min(1).max(200),
    leaveType: leaveTypeSchema,
    fromDate: dateKey,
    toDate: dateKey,
    days: z.number().min(0).max(366),
    reason: z.string().trim().max(1000),
    status: decisionStatusSchema,
    decidedBy: z.string().trim().min(1).max(200),
    decisionNote: z.string().trim().max(500).default(""),
  })
  .strict();

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

export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    q: z.string().trim().max(200).optional(),
    status: decisionStatusSchema.optional(),
    employeeId: z.string().trim().max(64).optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
  })
  .strict();

export type DecisionStatus = z.infer<typeof decisionStatusSchema>;
export type DecisionDto = z.infer<typeof decisionSchema>;
export type DecisionSnapshot = z.infer<typeof snapshotSchema>;
export type ListQuery = z.infer<typeof listQuery>;
