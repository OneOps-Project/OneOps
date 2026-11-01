import { apiRequest } from "./http";
import {
  eventsPageSchema,
  detailSchema,
  filtersSchema,
  type AuditFilters,
} from "../types";
export const checklogApi = {
  search: (filters: AuditFilters, page: number, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(page), pageSize: "20" });
    for (const [key, value] of Object.entries(filters))
      if (value.trim()) query.set(key, value.trim());
    return apiRequest(`/checklog?${query}`, { signal }, eventsPageSchema);
  },
  filters: (signal?: AbortSignal) =>
    apiRequest("/checklog/filters", { signal }, filtersSchema),
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest(`/checklog/${encodeURIComponent(id)}`, { signal }, detailSchema),
};
