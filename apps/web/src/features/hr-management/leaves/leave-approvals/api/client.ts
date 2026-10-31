import type { z } from "zod";
import {
  decisionInput,
  decisionResultSchema,
  historySchema,
  queueSchema,
  type DecisionStatus,
  type QueueItem,
} from "@/features/hr-management/leaves/leave-approvals/types";

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
  queue: (signal?: AbortSignal) =>
    apiRequest("/leaves/workflow/queue", { signal }, queueSchema),
  history: (params: Record<string, string>, signal?: AbortSignal) => {
    const query = new URLSearchParams({ pageSize: "100", ...params });
    return apiRequest(`/leave-approvals?${query}`, { signal }, historySchema);
  },
  decide: (item: QueueItem, input: { status: DecisionStatus; note: string }) =>
    apiRequest(
      `/leaves/workflow/queue/${item.id}/decision`,
      { method: "POST", body: JSON.stringify(decisionInput.parse(input)) },
      decisionResultSchema,
    ),
};
