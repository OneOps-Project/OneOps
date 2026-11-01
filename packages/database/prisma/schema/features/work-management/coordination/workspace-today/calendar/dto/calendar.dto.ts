import { z } from "zod";
const recordInput = z
  .object({
    code: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(500),
    scope: z.string().trim().max(250).default(""),
    status: z.enum(["Đã lên lịch", "Đang diễn ra", "Hoàn thành", "Đã hủy"]),
    date: z.iso.date(),
    assignee: z.string().trim().max(150).default(""),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
const recordPatch = recordInput
  .omit({ scope: true, assignee: true, note: true })
  .partial()
  .extend({
    scope: z.string().trim().max(250).optional(),
    assignee: z.string().trim().max(150).optional(),
    note: z.string().trim().max(2000).optional(),
  });
export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
    q: z.string().trim().max(500).optional(),
    scope: z.string().max(250).optional(),
    status: z.string().max(150).optional(),
    assignee: z.string().trim().max(150).optional(),
  })
  .strict();
export const versionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export const fieldsSchema = z
  .object({
    kind: z.enum(["Cuộc họp", "Thời gian tập trung", "Sự kiện"]).optional(),
    startTime: z
      .union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")])
      .optional(),
    endTime: z
      .union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")])
      .optional(),
    location: z.string().trim().max(1000).optional(),
    attendees: z.string().trim().max(1000).optional(),
  })
  .strict();
export const createSchema = recordInput.extend({
  fields: fieldsSchema.default({}),
});
export const updateSchema = recordPatch
  .extend({
    fields: fieldsSchema.optional(),
    version: z.number().int().positive(),
  })
  .strict();
export const recordSchema = createSchema.extend({
  id: z.uuid(),
  module: z.literal("calendar"),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const validatedCreateSchema = createSchema.refine(
  (value) =>
    !value.fields.startTime ||
    !value.fields.endTime ||
    value.fields.endTime > value.fields.startTime,
  { message: "Giờ kết thúc phải sau giờ bắt đầu", path: ["fields", "endTime"] },
);
export type RecordInput = z.input<typeof createSchema>;
export type RecordOutput = z.infer<typeof recordSchema>;
export type RecordDto = RecordOutput;
export type ListQuery = z.infer<typeof listQuery>;
