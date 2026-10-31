import { z } from "zod";

export const statusSchema = z.enum(["ACTIVE", "INACTIVE"]);
const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm");
const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");
const ipv4 = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const cidr = z
  .string()
  .trim()
  .min(1, "Nhập địa chỉ IP hoặc dải mạng")
  .max(64)
  .regex(
    new RegExp(`^${ipv4}(\\.${ipv4}){3}(/(3[0-2]|[12]?\\d))?$`),
    "Nhập IPv4 hợp lệ, ví dụ 203.0.113.10 hoặc 203.0.113.0/24",
  );

// Patch schemas must not carry defaults: Zod keeps them through `.partial()`,
// which would silently reset omitted fields to their default value.
const policyFields = {
  timezone: z.string().trim().min(1, "Nhập múi giờ").max(64),
  workStart: clockTime,
  workEnd: clockTime,
  breakMinutes: z.number().int().min(0).max(240),
  lateGraceMinutes: z.number().int().min(0).max(120),
  workDays: z
    .array(z.number().int().min(1).max(7))
    .min(1, "Chọn ít nhất một ngày làm việc")
    .max(7)
    .refine(
      (days) => new Set(days).size === days.length,
      "Ngày làm việc không được trùng",
    ),
};
export const updatePolicySchema = z
  .object(policyFields)
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();

const holidayFields = {
  date: dateKey,
  name: z.string().trim().min(1, "Nhập tên ngày lễ").max(200),
  paid: z.boolean(),
  note: z.string().trim().max(500),
  status: statusSchema,
};
export const createHolidaySchema = z
  .object({
    ...holidayFields,
    paid: holidayFields.paid.default(true),
    note: holidayFields.note.default(""),
    status: holidayFields.status.default("ACTIVE"),
  })
  .strict();
export const updateHolidaySchema = z
  .object(holidayFields)
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();

const networkFields = {
  label: z.string().trim().min(1, "Nhập tên mạng").max(150),
  cidr,
  note: z.string().trim().max(500),
  status: statusSchema,
};
export const createNetworkSchema = z
  .object({
    ...networkFields,
    note: networkFields.note.default(""),
    status: networkFields.status.default("ACTIVE"),
  })
  .strict();
export const updateNetworkSchema = z
  .object(networkFields)
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();

const quotaFields = {
  year: z.number().int().min(2000).max(2100),
  daysPerYear: z.number().int().min(0).max(366),
  maxCarryOverDays: z.number().int().min(0).max(366),
  note: z.string().trim().max(500),
};
export const createQuotaSchema = z
  .object({
    ...quotaFields,
    daysPerYear: quotaFields.daysPerYear.default(12),
    maxCarryOverDays: quotaFields.maxCarryOverDays.default(0),
    note: quotaFields.note.default(""),
  })
  .strict();
export const updateQuotaSchema = z
  .object(quotaFields)
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();

export const policySchema = z
  .object({
    ...policyFields,
    id: z.uuid(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export const holidaySchema = z
  .object({
    ...holidayFields,
    id: z.uuid(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export const networkSchema = z
  .object({
    ...networkFields,
    id: z.uuid(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export const quotaSchema = z
  .object({
    ...quotaFields,
    id: z.uuid(),
    version: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
    q: z.string().trim().max(200).optional(),
    status: statusSchema.optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .strict();

export type Status = z.infer<typeof statusSchema>;
export type PolicyDto = z.infer<typeof policySchema>;
export type PolicyPatch = z.infer<typeof updatePolicySchema>;
export type HolidayDto = z.infer<typeof holidaySchema>;
export type HolidayInput = z.input<typeof createHolidaySchema>;
export type NetworkDto = z.infer<typeof networkSchema>;
export type NetworkInput = z.input<typeof createNetworkSchema>;
export type QuotaDto = z.infer<typeof quotaSchema>;
export type QuotaInput = z.input<typeof createQuotaSchema>;
export type ListQuery = z.infer<typeof listQuery>;
