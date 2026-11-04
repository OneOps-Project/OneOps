import { z } from "zod";
export const workStatuses = [
  "office",
  "business",
  "remote",
  "absent",
  "leave",
] as const;
export const attendanceFlags = ["late", "early", "missing-checkout"] as const;
export const memberSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string(),
  groupId: z.string().nullable(),
  status: z.enum(workStatuses),
  checkInAt: z.iso.datetime().nullable(),
  checkOutAt: z.iso.datetime().nullable(),
  flags: z.array(z.enum(attendanceFlags)),
});
export const workforceSchema = z.object({
  date: z.iso.date(),
  policy: z.object({
    officeIps: z.array(z.string()),
    shiftStart: z.string(),
    shiftEnd: z.string(),
  }),
  groups: z.array(z.object({ id: z.string(), name: z.string() })),
  members: z.array(memberSchema),
});
export const reminderResultSchema = z.object({ sent: z.number().int() });
export type WorkStatus = (typeof workStatuses)[number];
export type AttendanceFlag = (typeof attendanceFlags)[number];
export type Member = z.infer<typeof memberSchema>;
export type Workforce = z.infer<typeof workforceSchema>;
