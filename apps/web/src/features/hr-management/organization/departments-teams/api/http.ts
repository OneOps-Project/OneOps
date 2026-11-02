import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// TODO: [INTEGRATION] - Replace mock identity headers with the real Auth session.
export type MockAuthIdentity = {
  id: string;
  role: "MANAGER" | "EMPLOYEE";
  isSuperAdmin: boolean;
  permissions: Array<"organization.department.create">;
};

export const defaultMockAuthIdentity: MockAuthIdentity = {
  id: "00000000-0000-4000-8000-000000000001",
  role: "MANAGER",
  isSuperAdmin: true,
  permissions: [],
};

let mockAuthIdentity: MockAuthIdentity | null = null;
const identityListeners = new Set<
  (identity: MockAuthIdentity | null) => void
>();

export function setMockAuthIdentity(identity: MockAuthIdentity | null) {
  if (
    identity?.id === mockAuthIdentity?.id &&
    identity?.role === mockAuthIdentity?.role &&
    identity?.isSuperAdmin === mockAuthIdentity?.isSuperAdmin &&
    identity?.permissions.join(",") === mockAuthIdentity?.permissions.join(",")
  )
    return;
  mockAuthIdentity = identity;
  for (const listener of identityListeners) listener(identity);
}

export function getMockAuthIdentity() {
  return mockAuthIdentity;
}

export function subscribeMockAuthIdentity(
  listener: (identity: MockAuthIdentity | null) => void,
) {
  identityListeners.add(listener);
  return () => identityListeners.delete(listener);
}

export function getMockAuthHeaders(): HeadersInit {
  const identity =
    process.env.NODE_ENV !== "production"
      ? (mockAuthIdentity ?? defaultMockAuthIdentity)
      : null;
  if (!identity) return {};
  const headers: Record<string, string> = {
    "x-mock-user-id": identity.id,
    "x-mock-role": identity.role,
    "x-mock-is-super-admin": String(identity.isSuperAdmin),
  };
  if (identity.permissions.length)
    headers["x-mock-permissions"] = identity.permissions.join(",");
  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...getMockAuthHeaders(),
    },
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Không thể kết nối API. Vui lòng thử lại.";
    throw new ApiError(response.status, message);
  }
  return schema.parse(body);
}
