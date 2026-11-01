import { z } from "zod";
const recordInput = z
  .object({
    code: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(500),
    scope: z.string().trim().max(250).default(""),
    status: z.enum(["Cần làm", "Đang thực hiện", "Chờ phản hồi", "Hoàn thành"]),
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
    assigneeAccountId: z.uuid().optional(),
    managerAccountId: z.uuid().optional(),
    reassignmentRequired: z.boolean().optional(),
    reassignmentReason: z.string().max(500).optional(),
    reassignmentAt: z.iso.datetime().optional(),
    reassignmentBy: z.uuid().optional(),
    project: z.string().trim().max(1000).optional(),
    priority: z.enum(["Thấp", "Trung bình", "Cao", "Khẩn cấp"]).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    startDate: z.union([z.iso.date(), z.literal("")]).optional(),
    tags: z.string().trim().max(1000).optional(),
    comments: z
      .array(
        z
          .object({
            id: z.uuid(),
            text: z.string().trim().min(1).max(2000),
            author: z.string().trim().min(1).max(150),
            createdAt: z.iso.datetime(),
          })
          .strict(),
      )
      .max(500)
      .optional(),
    checklist: z
      .array(
        z
          .object({
            id: z.uuid(),
            title: z.string().trim().min(1).max(500),
            done: z.boolean(),
          })
          .strict(),
      )
      .max(200)
      .optional(),
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
  module: z.literal("tasks"),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const validatedCreateSchema = createSchema.refine(
  (value) => !value.fields.startDate || value.fields.startDate <= value.date,
  { message: "Hạn hoàn thành phải từ ngày bắt đầu trở đi", path: ["date"] },
);
export type RecordInput = z.input<typeof createSchema>;
export type RecordOutput = z.infer<typeof recordSchema>;
export type RecordDto = RecordOutput;
export type ListQuery = z.infer<typeof listQuery>;
