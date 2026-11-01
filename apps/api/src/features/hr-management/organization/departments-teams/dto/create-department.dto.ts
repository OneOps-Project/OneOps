import { z } from "zod";

const uuidList = z
  .array(z.uuid())
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Danh sách không được chứa ID trùng lặp.",
  });

export const createDepartmentSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).optional(),
    administratorIds: uuidList.min(1),
    accessUserIds: uuidList.default([]),
    accessGroupIds: uuidList.default([]),
  })
  .strict();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
