import { z } from "zod";
export const workModes = ["office", "business", "remote"] as const;
export const dayStatuses = [
  "office",
  "business",
  "remote",
  "leave",
  "absent",
  "holiday",
] as const;
export const attendanceFlags = ["late", "early", "missing-checkout"] as const;
export const todayRecordSchema = z.object({
  status: z.enum(workModes),
  note: z.string(),
  checkInAt: z.iso.datetime(),
  checkOutAt: z.iso.datetime().nullable(),
  flags: z.array(z.enum(attendanceFlags)),
});
export const todaySchema = z.object({
  date: z.iso.date(),
  employeeName: z.string(),
  network: z.object({ ip: z.string(), inOffice: z.boolean() }),
  policy: z.object({ shiftStart: z.string(), shiftEnd: z.string() }),
  record: todayRecordSchema.nullable(),
});
export const monthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  days: z.array(
    z.object({
      date: z.iso.date(),
      status: z.enum(dayStatuses),
      checkInAt: z.iso.datetime().nullable(),
      checkOutAt: z.iso.datetime().nullable(),
      flags: z.array(z.enum(attendanceFlags)),
    }),
  ),
});
export const colleaguesSchema = z.object({
  members: z.array(
    z.object({
      employeeId: z.string().min(1),
      name: z.string(),
      groupName: z.string().nullable(),
      status: z.enum([...workModes, "leave", "absent"]),
    }),
  ),
});
export const checkInSchema = z
  .object({
    status: z.enum(workModes),
    note: z.string().trim().max(500),
  })
  .strict()
  .refine((value) => value.status !== "business" || value.note.length > 0, {
    message: "Nhập địa điểm khi đi công tác / gặp khách.",
    path: ["note"],
  });
export type WorkMode = (typeof workModes)[number];
export type DayStatus = (typeof dayStatuses)[number];
export type AttendanceFlag = (typeof attendanceFlags)[number];
export type Today = z.infer<typeof todaySchema>;
export type MonthAttendance = z.infer<typeof monthSchema>;
export type MonthDay = MonthAttendance["days"][number];
export type Colleagues = z.infer<typeof colleaguesSchema>;
export type CheckInInput = z.input<typeof checkInSchema>;
