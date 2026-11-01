import { z } from "zod";

// 7 trạng thái theo spec mục 9
const statusEnum = z.enum([
  "Cần làm",
  "Đang làm",
  "Làm lại",
  "Chờ kiểm tra",
  "Hoãn lại",
  "Hoàn thành",
  "Đã hủy",
]);

// Priority theo spec 8.2
const priorityEnum = z.enum(["Thấp", "Trung bình", "Cao", "Khẩn cấp"]);

const recordInput = z
  .object({
    code: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(150), // spec 8.2: ≤150 ký tự
    scope: z.string().trim().max(250).default(""),
    status: statusEnum,
    date: z.iso.date(), // giữ date cũ để backward compatible
    assignee: z.string().trim().max(150).default(""),
    reviewer: z.string().trim().max(150).default(""), // Người kiểm tra
    deadline: z.iso.datetime().optional(), // Deadline ngày+giờ
    note: z.string().trim().max(2000).default(""),
    attachmentLinks: z.array(z.string().url().max(2000)).max(50).default([]),
  })
  .strict();
const recordPatch = recordInput
  .omit({
    scope: true,
    assignee: true,
    reviewer: true,
    note: true,
    attachmentLinks: true,
  })
  .partial()
  .extend({
    scope: z.string().trim().max(250).optional(),
    assignee: z.string().trim().max(150).optional(),
    reviewer: z.string().trim().max(150).optional(),
    note: z.string().trim().max(2000).optional(),
    attachmentLinks: z.array(z.string().url().max(2000)).max(50).optional(),
  });
export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
    q: z.string().trim().max(500).optional(),
    scope: z.string().max(250).optional(),
    status: z.string().max(150).optional(),
    assignee: z.string().trim().max(150).optional(),
    reviewer: z.string().trim().max(150).optional(),
  })
  .strict();
export const versionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

// Chỉ giữ các trường theo đặc tả Mục 8.2 + tính năng mở rộng hợp lệ
// Đã xóa: project, progress (vi phạm BR-TSK-08), startDate, tags (không có trong đặc tả)
// Dùng .passthrough() thay vì .strict() để backward compatible với data cũ có các trường đã xóa
export const fieldsSchema = z
  .object({
    priority: priorityEnum.optional(),
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
  .passthrough(); // Cho phép các trường cũ (project, progress, startDate, tags) tồn tại trong DB

// Lịch sử trạng thái bất biến
export const statusHistoryItemSchema = z
  .object({
    status: statusEnum,
    actor: z.string().trim().max(150),
    actorRole: z.enum(["manager", "assignee", "reviewer"]),
    timestamp: z.iso.datetime(),
    reason: z.string().trim().max(500).default(""),
  })
  .strict();

// Cờ cần giao lại
export const reassignmentFlagSchema = z
  .object({
    needed: z.boolean(),
    reason: z.string().trim().max(500).default(""),
    source: z
      .enum(["leave_approved", "account_locked", "left_team"])
      .optional(),
    timestamp: z.iso.datetime().optional(),
  })
  .strict();

// Lịch sử giao lại
export const reassignmentHistoryItemSchema = z
  .object({
    fromAssignee: z.string().trim().max(150),
    toAssignee: z.string().trim().max(150),
    managerId: z.string().trim().max(150),
    reason: z.string().trim().max(500),
    timestamp: z.iso.datetime(),
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
  statusHistory: z.array(statusHistoryItemSchema).default([]),
  reassignmentFlag: reassignmentFlagSchema.default({
    needed: false,
    reason: "",
  }),
  reassignmentHistory: z.array(reassignmentHistoryItemSchema).default([]),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Schema cho thay đổi trạng thái
export const changeStatusSchema = z
  .object({
    status: statusEnum,
    actorId: z.string().trim().min(1).max(150),
    actorRole: z.enum(["manager", "assignee", "reviewer"]),
    reason: z.string().trim().max(500).default(""),
    newDeadline: z.iso.datetime().optional(), // Khi làm lại cần deadline mới nếu quá hạn
  })
  .strict();

// Schema cho giao lại
export const reassignSchema = z
  .object({
    newAssignee: z.string().trim().min(1).max(150),
    managerId: z.string().trim().min(1).max(150),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export const validatedCreateSchema = createSchema
  .refine((value) => !value.reviewer || value.reviewer !== value.assignee, {
    message: "Người kiểm tra phải khác người phụ trách",
    path: ["reviewer"],
  })
  .refine(
    (value) => {
      if (!value.deadline) return true;
      const deadlineDate = new Date(value.deadline);
      const now = new Date();
      return deadlineDate > now;
    },
    { message: "Deadline không được ở quá khứ", path: ["deadline"] },
  );
export type RecordInput = z.input<typeof createSchema>;
export type RecordOutput = z.infer<typeof recordSchema>;
export type RecordDto = RecordOutput;
export type ListQuery = z.infer<typeof listQuery>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ReassignInput = z.infer<typeof reassignSchema>;
export type StatusHistoryItem = z.infer<typeof statusHistoryItemSchema>;
export type ReassignmentFlag = z.infer<typeof reassignmentFlagSchema>;
export type ReassignmentHistoryItem = z.infer<
  typeof reassignmentHistoryItemSchema
>;
