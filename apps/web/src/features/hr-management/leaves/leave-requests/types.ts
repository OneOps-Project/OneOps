import { z } from "zod";

export const statusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
export const leaveTypeSchema = z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]);

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

export const leaveInput = z
  .object({
    employeeId: z.string().trim().min(1, "Nhập mã nhân sự").max(64),
    employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
    leaveType: leaveTypeSchema.default("ANNUAL"),
    fromDate: dateKey,
    toDate: dateKey,
    reason: z.string().trim().min(10, "Lý do cần ít nhất 10 ký tự").max(1000),
  })
  .strict();

export const leaveSchema = z
  .object({
    id: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    leaveType: leaveTypeSchema,
    fromDate: z.string(),
    toDate: z.string(),
    days: z.number(),
    reason: z.string(),
    status: statusSchema,
    decidedBy: z.string(),
    decidedAt: z.iso.datetime().nullable(),
    decisionNote: z.string(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const listSchema = z.object({
  items: z.array(leaveSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type Status = z.infer<typeof statusSchema>;
export type LeaveType = z.infer<typeof leaveTypeSchema>;
export type LeaveDto = z.infer<typeof leaveSchema>;
export type LeaveInput = z.input<typeof leaveInput>;
