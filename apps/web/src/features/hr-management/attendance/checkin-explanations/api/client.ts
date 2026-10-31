import type { z } from "zod";
import {
  explanationInput,
  explanationSchema,
  listSchema,
  type ExplanationDto,
  type ExplanationInput,
} from "@/features/hr-management/attendance/checkin-explanations/types";

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
    return apiRequest(`/checkin-explanations?${query}`, { signal }, listSchema);
  },
  create: (input: ExplanationInput) =>
    apiRequest(
      "/checkin-explanations",
      { method: "POST", body: JSON.stringify(explanationInput.parse(input)) },
      explanationSchema,
    ),
  update: (
    record: ExplanationDto,
    patch: {
      reason?: string;
      type?: string;
      requestedCheckIn?: string;
      requestedCheckOut?: string;
    },
  ) =>
    apiRequest(
      `/checkin-explanations/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      explanationSchema,
    ),
  decide: (
    record: ExplanationDto,
    input: { status: "APPROVED" | "REJECTED"; note: string },
  ) =>
    apiRequest(
      `/checkin-explanations/${record.id}/decision`,
      {
        method: "POST",
        body: JSON.stringify({ ...input, version: record.version }),
      },
      explanationSchema,
    ),
  cancel: (record: ExplanationDto) =>
    apiRequest(
      `/checkin-explanations/${record.id}/cancel`,
      { method: "POST", body: JSON.stringify({ version: record.version }) },
      explanationSchema,
    ),
};
