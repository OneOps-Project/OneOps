import { z } from "zod";

export const transferMemberSchema = z
  .object({
    targetTeamId: z.uuid(),
    userIds: z.array(z.uuid()).min(1),
  })
  .strict()
  .refine((input) => new Set(input.userIds).size === input.userIds.length, {
    message: "Danh sách nhân viên không được chứa ID trùng lặp.",
    path: ["userIds"],
  });

export type TransferMemberInput = z.infer<typeof transferMemberSchema>;
