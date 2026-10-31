import { z } from "zod";

export const statusSchema = z.enum([
  "IN_OFFICE",
  "REMOTE",
  "LEAVE",
  "OFF_SITE",
]);

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

const presenceFields = {
  employeeId: z.string().trim().min(1, "Chọn nhân sự").max(64),
  employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
  workDate: dateKey,
  status: statusSchema,
  shiftLabel: z.string().trim().max(120),
  note: z.string().trim().max(500),
};

export const createSchema = z
  .object({
    ...presenceFields,
    status: presenceFields.status.default("IN_OFFICE"),
    shiftLabel: presenceFields.shiftLabel.default(""),
    note: presenceFields.note.default(""),
  })
  .strict();

export const updateSchema = z
  .object({
    status: statusSchema.optional(),
    shiftLabel: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const presenceSchema = z
  .object({
    ...presenceFields,
    id: z.uuid(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const summarySchema = z.object({
  workDate: z.string(),
  items: z.array(z.object({ status: statusSchema, count: z.number() })),
  total: z.number(),
});

export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
    q: z.string().trim().max(200).optional(),
    status: statusSchema.optional(),
    employeeId: z.string().trim().max(64).optional(),
    workDate: dateKey.optional(),
  })
  .strict();

export const summaryQuery = z.object({ workDate: dateKey }).strict();

export type Status = z.infer<typeof statusSchema>;
export type PresenceDto = z.infer<typeof presenceSchema>;
export type PresenceInput = z.input<typeof createSchema>;
export type PresencePatch = z.infer<typeof updateSchema>;
export type ListQuery = z.infer<typeof listQuery>;
