import type { z } from "zod";
import {
  listSchema,
  presenceInput,
  presenceSchema,
  summarySchema,
  type PresenceDto,
  type PresenceInput,
} from "@/features/hr-management/attendance/workforce-board/types";

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
    return apiRequest(`/workforce-board?${query}`, { signal }, listSchema);
  },
  summary: (workDate: string, signal?: AbortSignal) =>
    apiRequest(
      `/workforce-board/summary?${new URLSearchParams({ workDate })}`,
      { signal },
      summarySchema,
    ),
  create: (input: PresenceInput) =>
    apiRequest(
      "/workforce-board",
      { method: "POST", body: JSON.stringify(presenceInput.parse(input)) },
      presenceSchema,
    ),
  update: (
    record: PresenceDto,
    patch: { status?: string; shiftLabel?: string; note?: string },
  ) =>
    apiRequest(
      `/workforce-board/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      presenceSchema,
    ),
};
