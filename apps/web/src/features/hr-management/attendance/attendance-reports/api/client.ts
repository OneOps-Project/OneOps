import type { z } from "zod";
import {
  lineInput,
  lineListSchema,
  lineSchema,
  periodInput,
  periodListSchema,
  periodSchema,
  summarySchema,
  type LineDto,
  type LineInput,
  type PeriodDto,
  type PeriodInput,
} from "@/features/hr-management/attendance/attendance-reports/types";

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
      `/attendance-reports/periods?${query}`,
      { signal },
      periodListSchema,
    );
  },
  createPeriod: (input: PeriodInput) =>
    apiRequest(
      "/attendance-reports/periods",
      { method: "POST", body: JSON.stringify(periodInput.parse(input)) },
      periodSchema,
    ),
  updatePeriod: (
    record: PeriodDto,
    patch: { name?: string; status?: string; note?: string },
  ) =>
    apiRequest(
      `/attendance-reports/periods/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      periodSchema,
    ),
  summary: (periodId: string, signal?: AbortSignal) =>
    apiRequest(
      `/attendance-reports/periods/${periodId}/summary`,
      { signal },
      summarySchema,
    ),

  listLines: (params: Record<string, string>, signal?: AbortSignal) => {
    const query = new URLSearchParams({ pageSize: "200", ...params });
    return apiRequest(
      `/attendance-reports/lines?${query}`,
      { signal },
      lineListSchema,
    );
  },
  createLine: (input: LineInput) =>
    apiRequest(
      "/attendance-reports/lines",
      { method: "POST", body: JSON.stringify(lineInput.parse(input)) },
      lineSchema,
    ),
  updateLine: (
    record: LineDto,
    patch: {
      employeeName?: string;
      workedDays?: number;
      paidLeaveDays?: number;
      unpaidLeaveDays?: number;
      overtimeHours?: number;
      note?: string;
    },
  ) =>
    apiRequest(
      `/attendance-reports/lines/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      lineSchema,
    ),
};
