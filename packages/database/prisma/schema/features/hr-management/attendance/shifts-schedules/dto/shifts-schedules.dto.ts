import { z } from "zod";

export const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export const sourceSchema = z.enum(["MANUAL", "PATTERN"]);

const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm");
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

const shiftFields = {
  name: z.string().trim().min(1, "Nhập tên ca").max(150),
  startTime: clockTime,
  endTime: clockTime,
  breakMinutes: z.number().int().min(0).max(240),
  nightShift: z.boolean(),
  effectiveFrom: dateKey,
  note: z.string().trim().max(500),
  status: statusSchema,
};

export const createShiftSchema = z
  .object({
    ...shiftFields,
    breakMinutes: shiftFields.breakMinutes.default(0),
    nightShift: shiftFields.nightShift.default(false),
    note: shiftFields.note.default(""),
    status: shiftFields.status.default("ACTIVE"),
  })
  .strict();

export const updateShiftSchema = z
  .object(shiftFields)
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();

export const slotSchema = z
  .object({ weekday: z.number().int().min(1).max(7), shiftId: z.uuid() })
  .strict();

const patternFields = {
  name: z.string().trim().min(1, "Nhập tên mẫu tuần").max(150),
  slots: z
    .array(slotSchema)
    .min(1, "Chọn ít nhất một ngày trong mẫu")
    .max(7)
    .refine(
      (slots) =>
        new Set(slots.map((slot) => slot.weekday)).size === slots.length,
      "Mỗi thứ chỉ được gán một ca trong mẫu",
    ),
  note: z.string().trim().max(500),
  status: statusSchema,
};

export const createPatternSchema = z
  .object({
    ...patternFields,
    note: patternFields.note.default(""),
    status: patternFields.status.default("ACTIVE"),
  })
  .strict();

export const updatePatternSchema = z
  .object(patternFields)
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();

const assignmentFields = {
  employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
  employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
  workDate: dateKey,
  shiftId: z.uuid(),
  source: sourceSchema,
  note: z.string().trim().max(500),
};

export const createAssignmentSchema = z
  .object({
    ...assignmentFields,
    source: assignmentFields.source.default("MANUAL"),
    note: assignmentFields.note.default(""),
  })
  .strict();

export const updateAssignmentSchema = z
  .object({
    shiftId: z.uuid().optional(),
    employeeName: z.string().trim().min(1).max(200).optional(),
    note: z.string().trim().max(500).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const bulkSchema = z
  .object({
    shiftId: z.uuid(),
    from: dateKey,
    to: dateKey,
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1, "Chọn ít nhất một thứ")
      .max(7),
    employees: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(64),
          name: z.string().trim().min(1).max(200),
        }),
      )
      .min(1, "Chọn ít nhất một nhân sự")
      .max(200),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const applyPatternSchema = z
  .object({
    from: dateKey,
    to: dateKey,
    employees: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(64),
          name: z.string().trim().min(1).max(200),
        }),
      )
      .min(1)
      .max(200),
  })
  .strict();

export const shiftSchema = z
  .object({
    ...shiftFields,
    id: z.uuid(),
    hours: z.number().min(0),
    assignmentCount: z.number().int().min(0),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const slotSchemaOut = z
  .object({ weekday: z.number().int().min(1).max(7), shiftId: z.uuid() })
  .strict();

export const patternSchema = z
  .object({
    ...patternFields,
    slots: z.array(slotSchemaOut),
    id: z.uuid(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const assignmentSchema = z
  .object({
    ...assignmentFields,
    id: z.uuid(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
    q: z.string().trim().max(200).optional(),
    status: statusSchema.optional(),
    employeeId: z.string().trim().max(64).optional(),
    from: dateKey.optional(),
    to: dateKey.optional(),
  })
  .strict();

export type ShiftDto = z.infer<typeof shiftSchema>;
export type ShiftInput = z.input<typeof createShiftSchema>;
export type PatternDto = z.infer<typeof patternSchema>;
export type PatternInput = z.input<typeof createPatternSchema>;
export type AssignmentDto = z.infer<typeof assignmentSchema>;
export type AssignmentInput = z.input<typeof createAssignmentSchema>;
export type ListQuery = z.infer<typeof listQuery>;
export type Slot = z.infer<typeof slotSchema>;
