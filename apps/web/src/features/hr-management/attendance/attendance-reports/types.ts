import { z } from "zod";
export const dayStatuses = [
  "present",
  "remote",
  "business",
  "leave",
  "absent",
  "holiday",
  "weekend",
] as const;
export const dayFlags = ["late", "early", "missing-checkout"] as const;
export const monthlyReportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  groups: z.array(z.object({ id: z.string(), name: z.string() })),
  rows: z.array(
    z.object({
      employeeId: z.string().min(1),
      name: z.string(),
      groupId: z.string().nullable(),
      days: z.array(
        z.object({
          date: z.iso.date(),
          status: z.enum(dayStatuses),
          flags: z.array(z.enum(dayFlags)),
        }),
      ),
      totals: z.object({
        workDays: z.number(),
        late: z.number().int(),
        early: z.number().int(),
        leave: z.number(),
      }),
    }),
  ),
});
export type DayStatus = (typeof dayStatuses)[number];
export type MonthlyReport = z.infer<typeof monthlyReportSchema>;
