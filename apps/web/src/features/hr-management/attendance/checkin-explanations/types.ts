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

export const explanationInput = z
  .object({
    employeeId: z.string().trim().min(1, "Nhập mã nhân sự").max(64),
    employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
    workDate: dateKey,
    type: typeSchema.default("FORGOT_CHECKIN"),
    reason: z
      .string()
      .trim()
      .min(10, "Giải trình cần ít nhất 10 ký tự")
      .max(1000),
    requestedCheckIn: clockTime.or(z.literal("")).default(""),
    requestedCheckOut: clockTime.or(z.literal("")).default(""),
    status: statusSchema.default("PENDING"),
    decidedBy: z.string().max(200).default(""),
    decidedAt: z.iso.datetime().nullable().default(null),
    decisionNote: z.string().max(500).default(""),
  })
  .strict();

export const explanationSchema = z
  .object({
    id: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    workDate: z.string(),
    type: typeSchema,
    reason: z.string(),
    requestedCheckIn: z.string(),
    requestedCheckOut: z.string(),
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
  items: z.array(explanationSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type Status = z.infer<typeof statusSchema>;
export type ExplanationType = z.infer<typeof typeSchema>;
export type ExplanationDto = z.infer<typeof explanationSchema>;
export type ExplanationInput = z.input<typeof explanationInput>;
