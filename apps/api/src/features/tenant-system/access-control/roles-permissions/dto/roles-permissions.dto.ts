import { z } from "zod";
export const permissionInput = z
  .object({ accountId: z.uuid(), manageAccounts: z.boolean() })
  .strict();
