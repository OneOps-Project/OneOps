import { z } from "zod";

const uuidList = z
  .array(z.uuid())
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Danh sách không được chứa ID trùng lặp.",
  });

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    managerIds: uuidList.min(1).optional(),
    memberUserIds: uuidList.optional(),
    memberGroupIds: uuidList.optional(),
    confirmTransferUserIds: uuidList.optional(),
  })
  .strict()
  .refine(
    (input) =>
      !input.confirmTransferUserIds ||
      input.confirmTransferUserIds.every((id) =>
        input.memberUserIds?.includes(id),
      ),
    {
      message:
        "Chỉ xác nhận chuyển cho thành viên có trong danh sách Team mới.",
      path: ["confirmTransferUserIds"],
    },
  )
  .refine((input) => Object.keys(input).length > 0, {
    message: "Cần có ít nhất một trường để cập nhật.",
  });

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
