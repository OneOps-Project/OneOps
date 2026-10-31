import type { z } from "zod";
import {
  leaveInput,
  leaveSchema,
  listSchema,
  type LeaveDto,
  type LeaveInput,
} from "@/features/hr-management/leaves/leave-requests/types";

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
    return apiRequest(`/leave-requests?${query}`, { signal }, listSchema);
  },
  create: (input: LeaveInput) =>
    apiRequest(
      "/leave-requests",
      { method: "POST", body: JSON.stringify(leaveInput.parse(input)) },
      leaveSchema,
    ),
  update: (
    record: LeaveDto,
    patch: {
      leaveType?: string;
      fromDate?: string;
      toDate?: string;
      reason?: string;
    },
  ) =>
    apiRequest(
      `/leave-requests/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      leaveSchema,
    ),
  cancel: (record: LeaveDto) =>
    apiRequest(
      `/leave-requests/${record.id}/cancel`,
      { method: "POST", body: JSON.stringify({ version: record.version }) },
      leaveSchema,
    ),
};
