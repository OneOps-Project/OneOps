import { z } from "zod";

export const allocationStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "CANCELLED",
]);

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

export const periodInput = z
  .object({
    employeeId: z.string().trim().min(1, "Nhập mã nhân sự").max(64),
    employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
    fromDate: dateKey,
    toDate: dateKey,
    standardHoursPerDay: z.number().min(1).max(24).default(8),
    holidayDays: z.number().min(0).max(366).default(0),
    leaveDays: z.number().min(0).max(366).default(0),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const periodSchema = z
  .object({
    id: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
    standardHoursPerDay: z.number(),
    workingDays: z.number().int().min(0),
    holidayDays: z.number(),
    leaveDays: z.number(),
    note: z.string(),
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

export const workloadSchema = z.object({
  period: periodSchema,
  summary: capacitySummarySchema,
});

export const periodListSchema = z.object({
  items: z.array(periodSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export const allocationListSchema = z.object({
  items: z.array(allocationSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AllocationStatus = z.infer<typeof allocationStatusSchema>;
export type PeriodDto = z.infer<typeof periodSchema>;
export type PeriodInput = z.input<typeof periodInput>;
export type AllocationDto = z.infer<typeof allocationSchema>;
export type AllocationInput = z.input<typeof allocationInput>;
export type CapacitySummary = z.infer<typeof capacitySummarySchema>;
export type Workload = z.infer<typeof workloadSchema>;
