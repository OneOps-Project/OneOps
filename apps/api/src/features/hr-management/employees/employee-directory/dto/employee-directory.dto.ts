import { z } from "zod";
export const employeeInput = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9._-]{1,99}$/),
    name: z.string().trim().min(1).max(200),
    email: z.email().trim().toLowerCase().max(254),
  })
  .strict();
export type EmployeeInput = z.infer<typeof employeeInput>;
