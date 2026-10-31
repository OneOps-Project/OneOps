import { z } from "zod";

export const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export const sourceSchema = z.enum(["MANUAL", "PATTERN"]);
const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm");
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

export const shiftInput = z
  .object({
    name: z.string().trim().min(1, "Nhập tên ca").max(150),
    startTime: clockTime,
    endTime: clockTime,
    breakMinutes: z.number().int().min(0).max(240).default(0),
    nightShift: z.boolean().default(false),
    effectiveFrom: dateKey,
    note: z.string().trim().max(500).default(""),
    status: statusSchema.default("ACTIVE"),
  })
  .strict();

export const shiftSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    breakMinutes: z.number(),
    nightShift: z.boolean(),
    effectiveFrom: z.string(),
    note: z.string(),
    status: statusSchema,
    hours: z.number(),
    assignmentCount: z.number(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const slot = z.object({
  weekday: z.number().int().min(1).max(7),
  shiftId: z.uuid(),
});

export const patternInput = z
  .object({
    name: z.string().trim().min(1, "Nhập tên mẫu tuần").max(150),
    slots: z
      .array(slot)
      .min(1, "Chọn ít nhất một ngày trong mẫu")
      .max(7)
      .refine(
        (slots) =>
          new Set(slots.map((item) => item.weekday)).size === slots.length,
        "Mỗi thứ chỉ được gán một ca trong mẫu",
      ),
    note: z.string().trim().max(500).default(""),
    status: statusSchema.default("ACTIVE"),
  })
  .strict();

export const patternSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    slots: z.array(slot),
    note: z.string(),
    status: statusSchema,
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const assignmentInput = z
  .object({
    employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
    employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
    workDate: dateKey,
    shiftId: z.uuid(),
    source: sourceSchema.default("MANUAL"),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const assignmentSchema = z
  .object({
    id: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    workDate: z.string(),
    shiftId: z.uuid(),
    source: sourceSchema,
    note: z.string(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const bulkInput = z
  .object({
    shiftId: z.uuid(),
    from: dateKey,
    to: dateKey,
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1, "Chọn ít nhất một thứ"),
    employees: z
      .array(
        z.object({
          id: z.string().trim().min(1, "Nhập mã nhân sự").max(64),
          name: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
        }),
      )
      .min(1, "Chọn ít nhất một nhân sự")
      .max(200),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const applyInput = z
  .object({
    from: dateKey,
    to: dateKey,
    employees: z
      .array(
        z.object({
          id: z.string().trim().min(1, "Nhập mã nhân sự").max(64),
          name: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
        }),
      )
      .min(1, "Chọn ít nhất một nhân sự")
      .max(200),
  })
  .strict();

export const bulkResultSchema = z.object({
  created: z.number(),
  skipped: z.number(),
  total: z.number(),
  days: z.number(),
  employees: z.number(),
});

export const applyResultSchema = z.object({
  created: z.number(),
  skipped: z.number(),
  total: z.number(),
  employees: z.number(),
  pattern: z.string(),
});

export const listSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });

export type Status = z.infer<typeof statusSchema>;
export type BulkInput = z.input<typeof bulkInput>;
export type ApplyInput = z.input<typeof applyInput>;
export type BulkResult = z.infer<typeof bulkResultSchema>;
export type ApplyResult = z.infer<typeof applyResultSchema>;
export type ShiftDto = z.infer<typeof shiftSchema>;
export type ShiftInput = z.input<typeof shiftInput>;
export type PatternDto = z.infer<typeof patternSchema>;
export type PatternInput = z.input<typeof patternInput>;
export type AssignmentDto = z.infer<typeof assignmentSchema>;
export type AssignmentInput = z.input<typeof assignmentInput>;
