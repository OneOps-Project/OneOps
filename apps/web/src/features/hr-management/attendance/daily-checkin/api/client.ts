import { apiRequest } from "@/features/hr-management/attendance/daily-checkin/api/http";
import {
  checkInSchema,
  colleaguesSchema,
  monthSchema,
  todayRecordSchema,
  todaySchema,
  type CheckInInput,
} from "@/features/hr-management/attendance/daily-checkin/types";
export const client = {
  today: (signal?: AbortSignal) =>
    apiRequest("/attendance/me/today", { signal }, todaySchema),
  checkIn: (input: CheckInInput) =>
    apiRequest(
      "/attendance/me/check-in",
      { method: "POST", body: JSON.stringify(checkInSchema.parse(input)) },
      todayRecordSchema,
    ),
  changeStatus: (input: CheckInInput) =>
    apiRequest(
      "/attendance/me/status",
      { method: "PATCH", body: JSON.stringify(checkInSchema.parse(input)) },
      todayRecordSchema,
    ),
  checkOut: () =>
    apiRequest(
      "/attendance/me/check-out",
      { method: "POST" },
      todayRecordSchema,
    ),
  month: (month: string, signal?: AbortSignal) =>
    apiRequest(
      "/attendance/me/history?month=" + encodeURIComponent(month),
      { signal },
      monthSchema,
    ),
  colleagues: (signal?: AbortSignal) =>
    apiRequest("/attendance/colleagues/today", { signal }, colleaguesSchema),
};
