import { z } from "zod";

export const statusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
export const typeSchema = z.enum([
  "FORGOT_CHECKIN",
  "MISSED_CHECKOUT",
  "WRONG_TIME",
  "OTHER",
]);

const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm");
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

const explanationFields = {
  employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
  employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
  workDate: dateKey,
  type: typeSchema,
  reason: z
    .string()
    .trim()
    .min(10, "Giải trình cần ít nhất 10 ký tự")
    .max(1000),
  requestedCheckIn: clockTime.or(z.literal("")),
  requestedCheckOut: clockTime.or(z.literal("")),
  status: statusSchema,
  decidedBy: z.string().max(200),
  decidedAt: z.iso.datetime().nullable(),
  decisionNote: z.string().max(500),
};

export const createSchema = z
  .object({
    ...explanationFields,
    type: explanationFields.type.default("FORGOT_CHECKIN"),
    requestedCheckIn: explanationFields.requestedCheckIn.default(""),
    requestedCheckOut: explanationFields.requestedCheckOut.default(""),
    status: explanationFields.status.default("PENDING"),
    decidedBy: explanationFields.decidedBy.default(""),
    decidedAt: explanationFields.decidedAt.default(null),
    decisionNote: explanationFields.decisionNote.default(""),
  })
  .strict();

export const updateSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(10, "Giải trình cần ít nhất 10 ký tự")
      .max(1000)
      .optional(),
    type: typeSchema.optional(),
    requestedCheckIn: clockTime.or(z.literal("")).optional(),
    requestedCheckOut: clockTime.or(z.literal("")).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const decisionSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(500).default(""),
    version: z.number().int().positive(),
  })
  .strict();

export const versionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export const explanationSchema = z
  .object({
    ...explanationFields,
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
    type: typeSchema.optional(),
    employeeId: z.string().trim().max(64).optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
  })
  .strict();

export type Status = z.infer<typeof statusSchema>;
export type ExplanationType = z.infer<typeof typeSchema>;
export type ExplanationDto = z.infer<typeof explanationSchema>;
export type ExplanationInput = z.input<typeof createSchema>;
export type ExplanationPatch = z.infer<typeof updateSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type ListQuery = z.infer<typeof listQuery>;
