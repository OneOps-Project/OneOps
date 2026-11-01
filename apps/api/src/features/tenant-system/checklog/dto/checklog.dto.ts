import { z } from "zod";
export const auditResult = z.enum(["SUCCESS", "FAILURE", "DENIED"]);
export const auditInputSchema = z
  .object({
    module: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(
        /^(tenant-system|work-management|hr-management|crm)(\/[a-z0-9-]+)*$/,
      ),
    actorId: z.uuid(),
    actorName: z.string().trim().min(1).max(100),
    action: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/),
    entityType: z.string().trim().min(1).max(50),
    entityId: z.uuid(),
    entityName: z.string().trim().max(200).optional(),
    result: auditResult.default("SUCCESS"),
    before: z.record(z.string(), z.json()).optional(),
    after: z.record(z.string(), z.json()).optional(),
  })
  .strict();
export type AuditInput = z.input<typeof auditInputSchema>;
export const checklogQuery = z
  .object({
    q: z.string().trim().max(200).default(""),
    module: z.string().trim().max(160).optional(),
    actor: z.string().trim().max(200).optional(),
    action: z.string().trim().max(100).optional(),
    entityType: z.string().trim().max(50).optional(),
    entityId: z.uuid().optional(),
    result: auditResult.optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
    path: ["to"],
  });
export type ChecklogQuery = z.infer<typeof checklogQuery>;
export const historyQuery = z
  .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
  .strict();
