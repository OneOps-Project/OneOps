import { z } from "zod";
export const explanationStatuses = ["pending", "approved", "rejected"] as const;
export const explanationIssues = [
  "early",
  "missing-checkin",
  "missing-checkout",
] as const;
export const explanationSchema = z.object({
  id: z.string().min(1),
  employeeName: z.string(),
  groupName: z.string().nullable(),
  date: z.iso.date(),
  issue: z.enum(explanationIssues),
  requestedCheckIn: z.string().nullable(),
  requestedCheckOut: z.string().nullable(),
  reason: z.string(),
  status: z.enum(explanationStatuses),
  reviewNote: z.string().nullable(),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});
export const explanationPageSchema = z.object({
  items: z.array(explanationSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export const rejectSchema = z
  .object({ note: z.string().trim().min(1, "Nhập lý do từ chối").max(1000) })
  .strict();
export type ExplanationStatus = (typeof explanationStatuses)[number];
export type ExplanationIssue = (typeof explanationIssues)[number];
export type Explanation = z.infer<typeof explanationSchema>;
