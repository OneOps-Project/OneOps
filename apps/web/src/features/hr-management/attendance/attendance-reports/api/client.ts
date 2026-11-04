import { apiRequest } from "@/features/hr-management/attendance/attendance-reports/api/http";
import { monthlyReportSchema } from "@/features/hr-management/attendance/attendance-reports/types";
export const client = {
  monthly: (month: string, groupId: string, signal?: AbortSignal) =>
    apiRequest(
      "/attendance/reports/monthly?" +
        new URLSearchParams(groupId ? { month, groupId } : { month }),
      { signal },
      monthlyReportSchema,
    ),
};
