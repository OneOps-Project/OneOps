import { z } from "zod";
export const accountSchema = z.object({
  id: z.uuid(),
  employeeId: z.uuid(),
  employeeCode: z.string(),
  displayName: z.string(),
  username: z.string(),
  email: z.email(),
  role: z.enum(["EMPLOYEE", "MANAGER"]),
  status: z.enum(["ACTIVE", "LOCKED"]),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Account = z.infer<typeof accountSchema>;
export const accountsPageSchema = z.object({
  items: z.array(accountSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export const employeeSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  email: z.email(),
  status: z.string(),
});
export type Employee = z.infer<typeof employeeSchema>;
export const groupSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  directory: z.string(),
  description: z.string(),
  ownerId: z.uuid(),
  owner: accountSchema,
  version: z.number(),
  members: z.array(z.object({ accountId: z.uuid(), account: accountSchema })),
});
export type AccountGroup = z.infer<typeof groupSchema>;
export const actorSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  role: z.enum(["EMPLOYEE", "MANAGER"]),
  manageAccounts: z.boolean(),
  superAdmin: z.boolean(),
});
export type Actor = z.infer<typeof actorSchema>;
export const historyPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      actorName: z.string(),
      action: z.string(),
      entityType: z.string(),
      entityId: z.uuid(),
      before: z.record(z.string(), z.unknown()).nullable(),
      after: z.record(z.string(), z.unknown()).nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type HistoryPage = z.infer<typeof historyPageSchema>;
