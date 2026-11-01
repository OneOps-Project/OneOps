import { z } from "zod";
import { apiRequest } from "./http";
import {
  accountSchema,
  accountsPageSchema,
  actorSchema,
  employeeSchema,
  groupSchema,
  historyPageSchema,
} from "../types";
const json = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});
export const accountsApi = {
  createEmployee: (input: unknown) =>
    apiRequest("/employees", json(input), employeeSchema),
  permissions: (id: string, signal?: AbortSignal) =>
    apiRequest(
      `/account-permissions/${id}`,
      { signal },
      z.object({ manageAccounts: z.boolean(), superAdmin: z.boolean() }),
    ),
  setAdministration: (accountId: string, manageAccounts: boolean) =>
    apiRequest("/account-permissions", json({ accountId, manageAccounts })),
  notifications: (signal?: AbortSignal) =>
    apiRequest(
      "/account-notifications",
      { signal },
      z.array(
        z.object({
          id: z.uuid(),
          message: z.string(),
          taskIds: z.array(z.uuid()),
          createdAt: z.iso.datetime(),
          readAt: z.iso.datetime().nullable(),
        }),
      ),
    ),
  readNotification: (id: string) =>
    apiRequest(`/account-notifications/${id}/read`, json({})),
  me: (signal?: AbortSignal) => apiRequest("/auth/me", { signal }, actorSchema),
  login: (username: string, password: string) =>
    apiRequest("/auth/login", json({ username, password }), actorSchema),
  logout: async () => {
    const result = await apiRequest("/auth/logout", json({}));
    window.dispatchEvent(new Event("oneops-session-changed"));
    return result;
  },
  list: (query: URLSearchParams, signal?: AbortSignal) =>
    apiRequest(`/accounts?${query}`, { signal }, accountsPageSchema),
  employees: (query = "", signal?: AbortSignal) =>
    apiRequest(
      `/accounts/employees?q=${encodeURIComponent(query)}`,
      { signal },
      z.array(employeeSchema),
    ),
  create: (input: unknown) =>
    apiRequest("/accounts", json(input), accountSchema),
  update: (id: string, input: unknown) =>
    apiRequest(
      `/accounts/${id}`,
      { ...json(input), method: "PATCH" },
      accountSchema,
    ),
  status: (id: string, input: unknown) =>
    apiRequest(
      `/accounts/${id}/status`,
      json(input),
      accountSchema.extend({ affectedTasks: z.number() }),
    ),
  role: (id: string, input: unknown) =>
    apiRequest(`/accounts/${id}/role`, json(input), accountSchema),
  password: (id: string, input: unknown) =>
    apiRequest(`/accounts/${id}/password`, json(input), accountSchema),
  history: (
    kind: "account" | "account-group",
    id: string,
    page: number,
    signal?: AbortSignal,
  ) =>
    apiRequest(
      `/accounts/${kind === "account-group" ? "groups/" : ""}${id}/history?page=${page}`,
      { signal },
      historyPageSchema,
    ),
  groups: (query = "", signal?: AbortSignal) =>
    apiRequest(
      `/accounts/groups?q=${encodeURIComponent(query)}`,
      { signal },
      z.array(groupSchema),
    ),
  createGroup: (input: unknown) =>
    apiRequest("/accounts/groups", json(input), groupSchema),
  updateGroup: (id: string, input: unknown) =>
    apiRequest(
      `/accounts/groups/${id}`,
      { ...json(input), method: "PATCH" },
      groupSchema,
    ),
};
