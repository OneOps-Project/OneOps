import type { z } from "zod";
import {
  holidayInput,
  holidaySchema,
  listSchema,
  networkInput,
  networkSchema,
  policyPatch,
  policySchema,
  quotaInput,
  quotaSchema,
  type HolidayDto,
  type HolidayInput,
  type NetworkDto,
  type NetworkInput,
  type PolicyDto,
  type PolicyPatch,
  type QuotaDto,
  type QuotaInput,
} from "@/features/tenant-system/organization/work-policies/types";

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

async function collect<T>(
  path: string,
  item: z.ZodType,
  signal?: AbortSignal,
): Promise<T[]> {
  const schema = listSchema(item);
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await apiRequest(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}&pageSize=100`,
      { signal },
      schema,
    );
    items.push(...(result.items as T[]));
    if (items.length >= result.total || !result.items.length) return items;
  }
}

const patch = (body: unknown) => JSON.stringify(body);

export const client = {
  readPolicy: (signal?: AbortSignal) =>
    apiRequest("/work-policies", { signal }, policySchema),
  updatePolicy: (record: PolicyDto, input: Partial<PolicyPatch>) =>
    apiRequest(
      "/work-policies",
      {
        method: "PUT",
        body: patch({ ...policyPatch.parse(input), version: record.version }),
      },
      policySchema,
    ),
  listHolidays: (signal?: AbortSignal) =>
    collect<HolidayDto>("/work-policies/holidays", holidaySchema, signal),
  createHoliday: (input: HolidayInput) =>
    apiRequest(
      "/work-policies/holidays",
      { method: "POST", body: patch(holidayInput.parse(input)) },
      holidaySchema,
    ),
  updateHoliday: (record: HolidayDto, input: Partial<HolidayInput>) =>
    apiRequest(
      "/work-policies/holidays/" + record.id,
      {
        method: "PATCH",
        body: patch({ ...input, version: record.version }),
      },
      holidaySchema,
    ),
  listNetworks: (signal?: AbortSignal) =>
    collect<NetworkDto>("/work-policies/networks", networkSchema, signal),
  createNetwork: (input: NetworkInput) =>
    apiRequest(
      "/work-policies/networks",
      { method: "POST", body: patch(networkInput.parse(input)) },
      networkSchema,
    ),
  updateNetwork: (record: NetworkDto, input: Partial<NetworkInput>) =>
    apiRequest(
      "/work-policies/networks/" + record.id,
      { method: "PATCH", body: patch({ ...input, version: record.version }) },
      networkSchema,
    ),
  listQuotas: (signal?: AbortSignal) =>
    collect<QuotaDto>("/work-policies/quotas", quotaSchema, signal),
  createQuota: (input: QuotaInput) =>
    apiRequest(
      "/work-policies/quotas",
      { method: "POST", body: patch(quotaInput.parse(input)) },
      quotaSchema,
    ),
  updateQuota: (record: QuotaDto, input: Partial<QuotaInput>) =>
    apiRequest(
      "/work-policies/quotas/" + record.id,
      { method: "PATCH", body: patch({ ...input, version: record.version }) },
      quotaSchema,
    ),
};
