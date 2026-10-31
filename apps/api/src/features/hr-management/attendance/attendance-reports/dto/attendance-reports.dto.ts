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

const periodFields = {
  periodKey,
  name: z.string().trim().min(1, "Nhập tên kỳ công").max(150),
  fromDate: dateKey,
  toDate: dateKey,
  status: statusSchema,
  note: z.string().trim().max(500),
};

export const createPeriodSchema = z
  .object({
    ...periodFields,
    status: periodFields.status.default("DRAFT"),
    note: periodFields.note.default(""),
  })
  .strict();

export const updatePeriodSchema = z
  .object({
    name: periodFields.name.optional(),
    fromDate: dateKey.optional(),
    toDate: dateKey.optional(),
    status: statusSchema.optional(),
    note: z.string().trim().max(500).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const periodSchema = z
  .object({
    ...periodFields,
    id: z.uuid(),
    lineCount: z.number().int().min(0),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const lineFields = {
  periodId: z.uuid(),
  employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
  employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
  workedDays: days,
  paidLeaveDays: days,
  unpaidLeaveDays: days,
  overtimeHours: hours,
  note: z.string().trim().max(500),
};

export const createLineSchema = z
  .object({
    ...lineFields,
    workedDays: days.default(0),
    paidLeaveDays: days.default(0),
    unpaidLeaveDays: days.default(0),
    overtimeHours: hours.default(0),
    note: lineFields.note.default(""),
  })
  .strict();

export const updateLineSchema = z
  .object({
    employeeName: lineFields.employeeName.optional(),
    workedDays: days.optional(),
    paidLeaveDays: days.optional(),
    unpaidLeaveDays: days.optional(),
    overtimeHours: hours.optional(),
    note: z.string().trim().max(500).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const lineSchema = z
  .object({
    ...lineFields,
    id: z.uuid(),
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

export const periodQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    q: z.string().trim().max(200).optional(),
    status: statusSchema.optional(),
  })
  .strict();

export const lineQuery = z
  .object({
    periodId: z.uuid(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(200),
    q: z.string().trim().max(200).optional(),
  })
  .strict();

export type Status = z.infer<typeof statusSchema>;
export type PeriodDto = z.infer<typeof periodSchema>;
export type PeriodInput = z.input<typeof createPeriodSchema>;
export type PeriodPatch = z.infer<typeof updatePeriodSchema>;
export type LineDto = z.infer<typeof lineSchema>;
export type LineInput = z.input<typeof createLineSchema>;
export type LinePatch = z.infer<typeof updateLineSchema>;
export type PeriodQuery = z.infer<typeof periodQuery>;
export type LineQuery = z.infer<typeof lineQuery>;
