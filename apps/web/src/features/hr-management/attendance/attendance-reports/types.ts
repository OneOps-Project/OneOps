import { z } from "zod";

export const statusSchema = z.enum(["DRAFT", "CLOSED"]);

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");
const periodKey = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Kỳ công phải có dạng YYYY-MM");
const days = z.number().min(0).max(31);
const hours = z.number().min(0).max(400);

export const periodInput = z
  .object({
    periodKey,
    name: z.string().trim().min(1, "Nhập tên kỳ công").max(150),
    fromDate: dateKey,
    toDate: dateKey,
    status: statusSchema.default("DRAFT"),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const periodSchema = z
  .object({
    id: z.uuid(),
    periodKey: z.string(),
    name: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
    status: statusSchema,
    note: z.string(),
    lineCount: z.number().int().min(0),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const lineInput = z
  .object({
    periodId: z.uuid(),
    employeeId: z.string().trim().min(1, "Nhập mã nhân sự").max(64),
    employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
    workedDays: days.default(0),
    paidLeaveDays: days.default(0),
    unpaidLeaveDays: days.default(0),
    overtimeHours: hours.default(0),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const lineSchema = z
  .object({
    id: z.uuid(),
    periodId: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    workedDays: z.number(),
    paidLeaveDays: z.number(),
    unpaidLeaveDays: z.number(),
    overtimeHours: z.number(),
    note: z.string(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const summarySchema = z.object({
  periodId: z.uuid(),
  headcount: z.number().int().min(0),
  workedDays: z.number(),
  paidLeaveDays: z.number(),
  unpaidLeaveDays: z.number(),
  overtimeHours: z.number(),
});

export const periodListSchema = z.object({
  items: z.array(periodSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export const lineListSchema = z.object({
  items: z.array(lineSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type Status = z.infer<typeof statusSchema>;
export type PeriodDto = z.infer<typeof periodSchema>;
export type PeriodInput = z.input<typeof periodInput>;
export type LineDto = z.infer<typeof lineSchema>;
export type LineInput = z.input<typeof lineInput>;
export type Summary = z.infer<typeof summarySchema>;
