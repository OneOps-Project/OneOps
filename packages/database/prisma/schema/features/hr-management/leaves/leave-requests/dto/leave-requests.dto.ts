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

const requestFields = {
  employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
  employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
  leaveType: leaveTypeSchema,
  fromDate: dateKey,
  toDate: dateKey,
  days: z.number().min(0).max(366),
  reason: z.string().trim().min(10, "Lý do cần ít nhất 10 ký tự").max(1000),
  status: statusSchema,
  decidedBy: z.string().max(200),
  decidedAt: z.iso.datetime().nullable(),
  decisionNote: z.string().max(500),
};

export const createSchema = z
  .object({
    ...requestFields,
    leaveType: requestFields.leaveType.default("ANNUAL"),
    days: requestFields.days.default(0),
    status: requestFields.status.default("PENDING"),
    decidedBy: requestFields.decidedBy.default(""),
    decidedAt: requestFields.decidedAt.default(null),
    decisionNote: requestFields.decisionNote.default(""),
  })
  .strict();

export const updateSchema = z
  .object({
    leaveType: leaveTypeSchema.optional(),
    fromDate: dateKey.optional(),
    toDate: dateKey.optional(),
    reason: z
      .string()
      .trim()
      .min(10, "Lý do cần ít nhất 10 ký tự")
      .max(1000)
      .optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const versionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export const requestSchema = z
  .object({
    ...requestFields,
    id: z.uuid(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    q: z.string().trim().max(200).optional(),
    status: statusSchema.optional(),
    leaveType: leaveTypeSchema.optional(),
    employeeId: z.string().trim().max(64).optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
  })
  .strict();

export type Status = z.infer<typeof statusSchema>;
export type LeaveType = z.infer<typeof leaveTypeSchema>;
export type LeaveRequestDto = z.infer<typeof requestSchema>;
export type LeaveRequestInput = z.input<typeof createSchema>;
export type LeaveRequestPatch = z.infer<typeof updateSchema>;
export type ListQuery = z.infer<typeof listQuery>;
