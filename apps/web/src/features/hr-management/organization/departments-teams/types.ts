import { z } from "zod";

export const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);
export type OrganizationStatus = z.infer<typeof statusSchema>;

const uuidList = z.array(z.uuid());

export const departmentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: statusSchema,
  createdBy: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  administratorIds: uuidList,
  accessUserIds: uuidList,
  accessGroupIds: uuidList,
  teams: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      status: statusSchema,
    }),
  ),
});
export type Department = z.infer<typeof departmentSchema>;

export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: statusSchema,
  departmentId: z.uuid(),
  department: z.object({
    id: z.uuid(),
    name: z.string(),
    status: statusSchema,
    administratorIds: uuidList,
  }),
  createdBy: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  managerIds: uuidList,
  memberUserIds: uuidList,
  memberGroupIds: uuidList,
});
export type Team = z.infer<typeof teamSchema>;

export const pageSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const historySchema = z.object({
  id: z.uuid(),
  entityType: z.enum(["DEPARTMENT", "TEAM"]),
  entityId: z.uuid(),
  action: z.enum(["CREATE", "UPDATE", "DEACTIVATE", "TRANSFER"]),
  oldValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  performedBy: z.uuid(),
  createdAt: z.iso.datetime(),
});
export type HistoryEntry = z.infer<typeof historySchema>;

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
  administratorIds: uuidList.min(1),
  accessUserIds: uuidList.default([]),
  accessGroupIds: uuidList.default([]),
});
export type DepartmentInput = z.input<typeof createDepartmentSchema>;

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(100),
  departmentId: z.uuid(),
  description: z.string().trim().max(1000).optional(),
  managerIds: uuidList.min(1),
  memberUserIds: uuidList.default([]),
  memberGroupIds: uuidList.default([]),
  confirmTransferUserIds: uuidList.optional(),
});
export type TeamInput = z.input<typeof createTeamSchema>;

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
  .refine((input) => Object.keys(input).length > 0, {
    message: "Cần có ít nhất một trường để cập nhật.",
  });
export type TeamUpdateInput = z.input<typeof updateTeamSchema>;

export const transferInputSchema = z.object({
  targetTeamId: z.uuid(),
  userIds: uuidList.min(1).refine((ids) => new Set(ids).size === ids.length, {
    message: "Danh sách nhân viên không được chứa ID trùng lặp.",
  }),
});
export type TransferInput = z.infer<typeof transferInputSchema>;

export const transferPreviewSchema = z.object({
  targetTeamId: z.uuid(),
  targetTeamName: z.string(),
  transfers: z.array(
    z.object({
      userId: z.uuid(),
      oldTeamId: z.uuid().nullable(),
      oldTeamName: z.string().nullable(),
      willTransfer: z.boolean(),
    }),
  ),
});
export type TransferPreview = z.infer<typeof transferPreviewSchema>;

export const createTeamTransferPreviewSchema = z.object({
  departmentId: z.uuid(),
  transfers: transferPreviewSchema.shape.transfers,
});
export type CreateTeamTransferPreview = z.infer<
  typeof createTeamTransferPreviewSchema
>;

export const transferResultSchema = z.object({
  team: teamSchema,
  transfers: z.array(
    z.object({
      userId: z.uuid(),
      oldTeamId: z.uuid().nullable(),
    }),
  ),
});
