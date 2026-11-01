import { z } from "zod";
export const roleSchema = z.enum(["EMPLOYEE", "MANAGER"]);
export const statusSchema = z.enum(["ACTIVE", "LOCKED"]);
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,63}$/,
    "Tên đăng nhập gồm 3–64 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
  );
export const passwordSchema = z
  .string()
  .min(12, "Mật khẩu cần ít nhất 12 ký tự.")
  .max(128)
  .regex(/[a-zA-Z]/, "Mật khẩu cần có chữ.")
  .regex(/[0-9]/, "Mật khẩu cần có số.");
export const createAccountSchema = z
  .object({
    employeeId: z.uuid(),
    username: usernameSchema,
    email: z.email().trim().toLowerCase().max(254),
    role: roleSchema,
    password: passwordSchema,
  })
  .strict();
export const updateAccountSchema = z
  .object({
    username: usernameSchema,
    email: z.email().trim().toLowerCase().max(254),
    version: z.number().int().positive(),
  })
  .strict();
export const changeRoleSchema = z
  .object({ role: roleSchema, version: z.number().int().positive() })
  .strict();
export const changeStatusSchema = z
  .object({
    status: statusSchema,
    reason: z.string().trim().min(1).max(500),
    version: z.number().int().positive(),
  })
  .strict();
export const resetPasswordSchema = z
  .object({ password: passwordSchema, version: z.number().int().positive() })
  .strict();
export const listAccountsSchema = z
  .object({
    q: z.string().trim().max(200).default(""),
    role: roleSchema.optional(),
    status: statusSchema.optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export const groupInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    directory: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9][a-z0-9-]{1,63}$/,
        "Directory gồm chữ thường không dấu, số và gạch ngang.",
      ),
    ownerId: z.uuid(),
    description: z.string().trim().max(2000).default(""),
    memberIds: z
      .array(z.uuid())
      .max(500)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Danh sách thành viên bị trùng.",
      ),
  })
  .strict();
export const groupUpdateSchema = groupInputSchema.extend({
  version: z.number().int().positive(),
});
export type CreateAccount = z.infer<typeof createAccountSchema>;
export type UpdateAccount = z.infer<typeof updateAccountSchema>;
export type ListAccounts = z.infer<typeof listAccountsSchema>;
export type GroupInput = z.infer<typeof groupInputSchema>;

export const accountSetupInput = createAccountSchema
  .omit({ employeeId: true, role: true })
  .extend({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9._-]{1,99}$/),
    name: z.string().trim().min(1).max(200),
  })
  .strict();
