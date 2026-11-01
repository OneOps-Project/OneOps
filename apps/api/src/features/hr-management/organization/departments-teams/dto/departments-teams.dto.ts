import { z } from "zod";

export {
  createDepartmentSchema,
  type CreateDepartmentInput,
} from "./create-department.dto.js";
export {
  updateDepartmentSchema,
  type UpdateDepartmentInput,
} from "./update-department.dto.js";
export { createTeamSchema, type CreateTeamInput } from "./create-team.dto.js";
export { updateTeamSchema, type UpdateTeamInput } from "./update-team.dto.js";
export {
  transferMemberSchema,
  type TransferMemberInput,
} from "./transfer-member.dto.js";
export {
  previewCreateTeamTransferSchema,
  type PreviewCreateTeamTransferInput,
} from "./preview-create-team-transfer.dto.js";

export const organizationStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    q: z.string().trim().max(100).optional(),
    status: organizationStatusSchema.optional(),
  })
  .strict();

export const historyQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export const statusUpdateSchema = z
  .object({ status: organizationStatusSchema })
  .strict();

export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
