import { apiRequest } from "@/features/hr-management/attendance/checkin-explanations/api/http";
import {
  explanationPageSchema,
  explanationSchema,
  rejectSchema,
  type Explanation,
  type ExplanationStatus,
} from "@/features/hr-management/attendance/checkin-explanations/types";
export const client = {
  async list(status: ExplanationStatus, signal?: AbortSignal) {
    const items: Explanation[] = [];
    let page = 1;
    while (true) {
      const result = await apiRequest(
        `/attendance/explanations?status=${status}&page=${page}&pageSize=100`,
        { signal },
        explanationPageSchema,
      );
      items.push(...result.items);
      if (items.length >= result.total || !result.items.length) return items;
      page++;
    }
  },
  approve: (item: Explanation) =>
    apiRequest(
      `/attendance/explanations/${item.id}/approve`,
      { method: "POST", body: JSON.stringify({ version: item.version }) },
      explanationSchema,
    ),
  reject: (item: Explanation, note: string) =>
    apiRequest(
      `/attendance/explanations/${item.id}/reject`,
      {
        method: "POST",
        body: JSON.stringify({
          ...rejectSchema.parse({ note }),
          version: item.version,
        }),
      },
      explanationSchema,
    ),
};
