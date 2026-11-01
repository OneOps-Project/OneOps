import { z } from "zod";

const uuidList = z
  .array(z.uuid())
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Danh sách không được chứa ID trùng lặp.",
  });

export const createTeamSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    departmentId: z.uuid(),
    description: z.string().trim().max(1000).optional(),
    managerIds: uuidList.min(1),
    memberUserIds: uuidList.default([]),
    memberGroupIds: uuidList.default([]),
    confirmTransferUserIds: uuidList.optional(),
  })
  .strict()
  .refine(
    (input) =>
      !input.confirmTransferUserIds ||
      input.confirmTransferUserIds.every((id) =>
        input.memberUserIds.includes(id),
      ),
    {
      message:
        "Chỉ xác nhận chuyển cho thành viên có trong danh sách Team mới.",
      path: ["confirmTransferUserIds"],
    },
  );

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
