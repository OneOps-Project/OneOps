import { z } from "zod";

export const statusSchema = z.enum(["OPEN", "COMPLETE", "LOCKED"]);
export const sourceSchema = z.enum(["WEB", "MOBILE", "KIOSK", "MANUAL"]);

const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm");
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

export const recordInput = z
  .object({
    employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
    employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
    workDate: dateKey,
    checkIn: clockTime,
    checkOut: clockTime.nullish(),
    source: sourceSchema.default("WEB"),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const recordSchema = z
  .object({
    id: z.uuid(),
    employeeId: z.string().max(64),
    employeeName: z.string().max(200),
    workDate: z.string(),
    checkIn: z.string(),
    checkOut: z.string().nullable(),
    source: sourceSchema,
    note: z.string(),
    status: statusSchema,
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const listSchema = z.object({
  items: z.array(recordSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type Status = z.infer<typeof statusSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type AttendanceDto = z.infer<typeof recordSchema>;
export type AttendanceInput = z.input<typeof recordInput>;
