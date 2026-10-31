import type { z } from "zod";
import {
  listSchema,
  recordInput,
  recordSchema,
  type AttendanceDto,
  type AttendanceInput,
} from "@/features/hr-management/attendance/daily-checkin/types";

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
  list: (params: Record<string, string>, signal?: AbortSignal) => {
    const query = new URLSearchParams({ pageSize: "100", ...params });
    return apiRequest(`/daily-checkin?${query}`, { signal }, listSchema);
  },
  create: (input: AttendanceInput) =>
    apiRequest(
      "/daily-checkin",
      { method: "POST", body: JSON.stringify(recordInput.parse(input)) },
      recordSchema,
    ),
  update: (
    record: AttendanceDto,
    patch: { checkIn?: string; checkOut?: string | null; note?: string },
  ) =>
    apiRequest(
      "/daily-checkin/" + record.id,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      recordSchema,
    ),
  lock: (record: AttendanceDto) =>
    apiRequest(
      `/daily-checkin/${record.id}/lock`,
      { method: "POST", body: JSON.stringify({ version: record.version }) },
      recordSchema,
    ),
};
