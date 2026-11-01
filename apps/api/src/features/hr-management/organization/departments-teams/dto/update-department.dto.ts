import { z } from "zod";

const uuidList = z
  .array(z.uuid())
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Danh sách không được chứa ID trùng lặp.",
  });

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    administratorIds: uuidList.min(1).optional(),
    accessUserIds: uuidList.optional(),
    accessGroupIds: uuidList.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Cần có ít nhất một trường để cập nhật.",
  });

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
