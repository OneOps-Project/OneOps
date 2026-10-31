import { z } from "zod";

export const statusSchema = z.enum([
  "IN_OFFICE",
  "REMOTE",
  "LEAVE",
  "OFF_SITE",
]);

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");

export const presenceInput = z
  .object({
    employeeId: z.string().trim().min(1, "Nhập mã nhân sự").max(64),
    employeeName: z.string().trim().min(1, "Nhập tên nhân sự").max(200),
    workDate: dateKey,
    status: statusSchema.default("IN_OFFICE"),
    shiftLabel: z.string().trim().max(120).default(""),
    note: z.string().trim().max(500).default(""),
  })
  .strict();

export const presenceSchema = z
  .object({
    id: z.uuid(),
    employeeId: z.string(),
    employeeName: z.string(),
    workDate: z.string(),
    status: statusSchema,
    shiftLabel: z.string(),
    note: z.string(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const summarySchema = z.object({
  workDate: z.string(),
  items: z.array(z.object({ status: statusSchema, count: z.number() })),
  total: z.number(),
});

export const listSchema = z.object({
  items: z.array(presenceSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type Status = z.infer<typeof statusSchema>;
export type PresenceDto = z.infer<typeof presenceSchema>;
export type PresenceInput = z.input<typeof presenceInput>;
export type Summary = z.infer<typeof summarySchema>;
