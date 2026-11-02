import { z } from "zod";

export const previewCreateTeamTransferSchema = z
  .object({
    userIds: z
      .array(z.uuid())
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Danh sách nhân viên không được chứa ID trùng lặp.",
      }),
  })
  .strict();

export type PreviewCreateTeamTransferInput = z.infer<
  typeof previewCreateTeamTransferSchema
>;
