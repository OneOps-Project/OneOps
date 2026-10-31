import type { z } from "zod";
import {
  allocationInput,
  allocationListSchema,
  allocationSchema,
  periodInput,
  periodListSchema,
  periodSchema,
  workloadSchema,
  type AllocationDto,
  type AllocationInput,
  type PeriodDto,
  type PeriodInput,
} from "@/features/hr-management/employees/resource-capacity/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof body?.message === "string"
        ? body.message
        : "Không thể kết nối API. Vui lòng thử lại.",
    );
  return schema ? schema.parse(body) : (body as T);
}

export const client = {
  listPeriods: (params: Record<string, string>, signal?: AbortSignal) => {
    const query = new URLSearchParams({ pageSize: "100", ...params });
    return apiRequest(
      `/resource-capacity/periods?${query}`,
      { signal },
      periodListSchema,
    );
  },
  createPeriod: (input: PeriodInput) =>
    apiRequest(
      "/resource-capacity/periods",
      { method: "POST", body: JSON.stringify(periodInput.parse(input)) },
      periodSchema,
    ),
  updatePeriod: (
    record: PeriodDto,
    patch: {
      fromDate?: string;
      toDate?: string;
      standardHoursPerDay?: number;
      holidayDays?: number;
      note?: string;
    },
  ) =>
    apiRequest(
      `/resource-capacity/periods/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      periodSchema,
    ),
  listAllocations: (params: Record<string, string>, signal?: AbortSignal) => {
    const query = new URLSearchParams({ pageSize: "100", ...params });
    return apiRequest(
      `/resource-capacity/allocations?${query}`,
      { signal },
      allocationListSchema,
    );
  },
  createAllocation: (input: AllocationInput) =>
    apiRequest(
      "/resource-capacity/allocations",
      { method: "POST", body: JSON.stringify(allocationInput.parse(input)) },
      allocationSchema,
    ),
  updateAllocation: (
    record: AllocationDto,
    patch: {
      projectRef?: string;
      percentage?: number;
      status?: string;
      note?: string;
    },
  ) =>
    apiRequest(
      `/resource-capacity/allocations/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      allocationSchema,
    ),
  cancelAllocation: (record: AllocationDto) =>
    apiRequest(
      `/resource-capacity/allocations/${record.id}/cancel`,
      { method: "POST", body: JSON.stringify({ version: record.version }) },
      allocationSchema,
    ),
  workload: (periodId: string, signal?: AbortSignal) =>
    apiRequest(`/workload/capacity/${periodId}`, { signal }, workloadSchema),
};
