import { apiRequest } from "@/features/hr-management/attendance/workforce-board/api/http";
import {
  reminderResultSchema,
  workforceSchema,
} from "@/features/hr-management/attendance/workforce-board/types";
export const client = {
  today: (date: string, signal?: AbortSignal) =>
    apiRequest(
      "/attendance/workforce?date=" + encodeURIComponent(date),
      { signal },
      workforceSchema,
    ),
  remind: (employeeIds: string[]) =>
    apiRequest(
      "/attendance/reminders",
      { method: "POST", body: JSON.stringify({ employeeIds }) },
      reminderResultSchema,
    ),
};
