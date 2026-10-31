import { z } from "zod";

export const statusSchema = z.enum(["OPEN", "COMPLETE", "LOCKED"]);
export const sourceSchema = z.enum(["WEB", "MOBILE", "KIOSK", "MANUAL"]);

const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm");
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

const recordFields = {
  employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
  employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
  workDate: dateKey,
  checkIn: clockTime,
  checkOut: clockTime.nullish(),
  source: sourceSchema,
  note: z.string().trim().max(500),
};

export const createSchema = z
  .object({
    ...recordFields,
    source: recordFields.source.default("WEB"),
    note: recordFields.note.default(""),
  })
  .strict();

// Patch không mang default để field bỏ trống giữ nguyên giá trị đã lưu.
export const updateSchema = z
  .object({
    checkIn: clockTime.optional(),
    checkOut: clockTime.nullish(),
    note: z.string().trim().max(500).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const lockSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export const recordSchema = z
  .object({
    ...recordFields,
    checkOut: clockTime.nullable(),
    status: statusSchema,
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
    employeeId: z.string().trim().max(64).optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
  })
  .strict();

export type AttendanceDto = z.infer<typeof recordSchema>;
export type AttendanceInput = z.input<typeof createSchema>;
export type AttendancePatch = z.infer<typeof updateSchema>;
export type ListQuery = z.infer<typeof listQuery>;
