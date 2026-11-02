import { z } from "zod";
import { apiRequest } from "@/features/hr-management/organization/departments-teams/api/http";
import {
  createDepartmentSchema,
  createTeamSchema,
  createTeamTransferPreviewSchema,
  departmentSchema,
  historySchema,
  pageSchema,
  statusSchema,
  teamSchema,
  transferInputSchema,
  transferPreviewSchema,
  transferResultSchema,
  updateTeamSchema,
  type DepartmentInput,
  type TeamInput,
  type TeamUpdateInput,
  type TransferInput,
} from "@/features/hr-management/organization/departments-teams/types";

const departmentPageSchema = pageSchema(departmentSchema);
const teamPageSchema = pageSchema(teamSchema);
const historyPageSchema = pageSchema(historySchema);
const listParams = (query: { q?: string; status?: string; page?: number }) => {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", "25");
  return `?${params}`;
};

export const client = {
  listDepartments: (
    query: { q?: string; status?: string; page?: number },
    signal?: AbortSignal,
  ) =>
    apiRequest(
      `/departments${listParams(query)}`,
      { signal },
      departmentPageSchema,
    ),
  getDepartment: (id: string, signal?: AbortSignal) =>
    apiRequest(`/departments/${id}`, { signal }, departmentSchema),
  createDepartment: (input: DepartmentInput) =>
    apiRequest(
      "/departments",
      {
        method: "POST",
        body: JSON.stringify(createDepartmentSchema.parse(input)),
      },
      departmentSchema,
    ),
  updateDepartment: (id: string, input: Partial<DepartmentInput>) =>
    apiRequest(
      `/departments/${id}`,
      { method: "PUT", body: JSON.stringify(input) },
      departmentSchema,
    ),
  setDepartmentStatus: (id: string, status: z.infer<typeof statusSchema>) =>
    apiRequest(
      `/departments/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      departmentSchema,
    ),
  departmentHistory: (id: string, page = 1, signal?: AbortSignal) =>
    apiRequest(
      `/departments/${id}/history?page=${page}&pageSize=25`,
      { signal },
      historyPageSchema,
    ),
  listTeams: (
    departmentId: string,
    query: { q?: string; status?: string; page?: number },
    signal?: AbortSignal,
  ) =>
    apiRequest(
      `/departments/${departmentId}/teams${listParams(query)}`,
      { signal },
      teamPageSchema,
    ),
  getTeam: (id: string, signal?: AbortSignal) =>
    apiRequest(`/teams/${id}`, { signal }, teamSchema),
  createTeam: (input: TeamInput) =>
    apiRequest(
      "/teams",
      { method: "POST", body: JSON.stringify(createTeamSchema.parse(input)) },
      teamSchema,
    ),
  previewCreateTransfers: (departmentId: string, userIds: string[]) =>
    apiRequest(
      `/departments/${departmentId}/team-transfer-preview`,
      {
        method: "POST",
        body: JSON.stringify({ userIds }),
      },
      createTeamTransferPreviewSchema,
    ),
  updateTeam: (id: string, input: TeamUpdateInput) =>
    apiRequest(
      `/teams/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(updateTeamSchema.parse(input)),
      },
      teamSchema,
    ),
  setTeamStatus: (id: string, status: z.infer<typeof statusSchema>) =>
    apiRequest(
      `/teams/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      teamSchema,
    ),
  teamHistory: (id: string, page = 1, signal?: AbortSignal) =>
    apiRequest(
      `/teams/${id}/history?page=${page}&pageSize=25`,
      { signal },
      historyPageSchema,
    ),
  previewTransfer: (teamId: string, input: TransferInput) =>
    apiRequest(
      `/teams/${teamId}/transfer-preview`,
      {
        method: "POST",
        body: JSON.stringify(transferInputSchema.parse(input)),
      },
      transferPreviewSchema,
    ),
  transfer: (teamId: string, input: TransferInput) =>
    apiRequest(
      `/teams/${teamId}/transfer`,
      {
        method: "POST",
        body: JSON.stringify(transferInputSchema.parse(input)),
      },
      transferResultSchema,
    ),
};
