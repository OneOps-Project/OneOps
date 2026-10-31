import { z } from "zod";

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

export const allocationStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "CANCELLED",
]);

const periodFields = {
  employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
  employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
  fromDate: dateKey,
  toDate: dateKey,
  standardHoursPerDay: z.number().min(1).max(24),
  holidayDays: z.number().min(0).max(366),
  leaveDays: z.number().min(0).max(366),
  note: z.string().trim().max(500),
};

export const periodInput = z
  .object({
    ...periodFields,
    standardHoursPerDay: periodFields.standardHoursPerDay.default(8),
    holidayDays: periodFields.holidayDays.default(0),
    leaveDays: periodFields.leaveDays.default(0),
    note: periodFields.note.default(""),
  })
  .strict();

export const periodPatch = z
  .object({
    fromDate: dateKey.optional(),
    toDate: dateKey.optional(),
    standardHoursPerDay: z.number().min(1).max(24).optional(),
    holidayDays: z.number().min(0).max(366).optional(),
    note: z.string().trim().max(500).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const periodSchema = z
  .object({
    ...periodFields,
    id: z.uuid(),
    workingDays: z.number().int().min(0),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const allocationInput = z
  .object({
    periodId: z.uuid(),
    projectRef: z.string().trim().min(1, "Nhập tên dự án").max(200),
    percentage: z.number().min(0).max(200).default(100),
    status: allocationStatusSchema.default("PLANNED"),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const allocationPatch = z
  .object({
    projectRef: z.string().trim().min(1).max(200).optional(),
    percentage: z.number().min(0).max(200).optional(),
    status: allocationStatusSchema.optional(),
    note: z.string().trim().max(500).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const allocationSchema = z
  .object({
    id: z.uuid(),
    periodId: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    projectRef: z.string(),
    percentage: z.number(),
    status: allocationStatusSchema,
    note: z.string(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const capacitySummarySchema = z
  .object({
    periodId: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    fromDate: dateKey,
    toDate: dateKey,
    workingDays: z.number().int().min(0),
    holidayDays: z.number(),
    leaveDays: z.number(),
    standardHoursPerDay: z.number(),
    availableHours: z.number(),
    allocatedPercent: z.number(),
    allocatedHours: z.number(),
    remainingHours: z.number(),
    utilization: z.number(),
    overCapacity: z.boolean(),
  })
  .strict();

export const periodListQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    q: z.string().trim().max(200).optional(),
    employeeId: z.string().trim().max(64).optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
  })
  .strict();

export const allocationListQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    q: z.string().trim().max(200).optional(),
    periodId: z.uuid().optional(),
    employeeId: z.string().trim().max(64).optional(),
    status: allocationStatusSchema.optional(),
  })
  .strict();

export const versionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export type AllocationStatus = z.infer<typeof allocationStatusSchema>;
export type PeriodDto = z.infer<typeof periodSchema>;
export type PeriodInput = z.infer<typeof periodInput>;
export type PeriodPatch = z.infer<typeof periodPatch>;
export type PeriodListQuery = z.infer<typeof periodListQuery>;
export type AllocationDto = z.infer<typeof allocationSchema>;
export type AllocationInput = z.infer<typeof allocationInput>;
export type AllocationPatch = z.infer<typeof allocationPatch>;
export type AllocationListQuery = z.infer<typeof allocationListQuery>;
export type CapacitySummary = z.infer<typeof capacitySummarySchema>;
