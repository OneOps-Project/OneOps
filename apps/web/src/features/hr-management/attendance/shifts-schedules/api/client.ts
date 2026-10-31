import type { z } from "zod";
import {
  applyInput,
  applyResultSchema,
  assignmentInput,
  assignmentSchema,
  bulkInput,
  bulkResultSchema,
  listSchema,
  patternInput,
  patternSchema,
  shiftInput,
  shiftSchema,
  type ApplyInput,
  type AssignmentDto,
  type AssignmentInput,
  type BulkInput,
  type PatternDto,
  type PatternInput,
  type ShiftDto,
  type ShiftInput,
} from "@/features/hr-management/attendance/shifts-schedules/types";

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

const query = (params: Record<string, string>) =>
  new URLSearchParams({ pageSize: "100", ...params }).toString();

const shiftList = listSchema(shiftSchema);
const patternList = listSchema(patternSchema);
const assignmentList = listSchema(assignmentSchema);

export const client = {
  listShifts: (params: Record<string, string>, signal?: AbortSignal) =>
    apiRequest(
      `/shifts-schedules/shifts?${query(params)}`,
      { signal },
      shiftList,
    ),
  createShift: (input: ShiftInput) =>
    apiRequest(
      "/shifts-schedules/shifts",
      { method: "POST", body: JSON.stringify(shiftInput.parse(input)) },
      shiftSchema,
    ),
  updateShift: (record: ShiftDto, input: ShiftInput) =>
    apiRequest(
      `/shifts-schedules/shifts/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...shiftInput.parse(input),
          version: record.version,
        }),
      },
      shiftSchema,
    ),

  listPatterns: (params: Record<string, string>, signal?: AbortSignal) =>
    apiRequest(
      `/shifts-schedules/patterns?${query(params)}`,
      { signal },
      patternList,
    ),
  createPattern: (input: PatternInput) =>
    apiRequest(
      "/shifts-schedules/patterns",
      { method: "POST", body: JSON.stringify(patternInput.parse(input)) },
      patternSchema,
    ),
  updatePattern: (record: PatternDto, input: PatternInput) =>
    apiRequest(
      `/shifts-schedules/patterns/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...patternInput.parse(input),
          version: record.version,
        }),
      },
      patternSchema,
    ),
  applyPattern: (record: PatternDto, input: ApplyInput) =>
    apiRequest(
      `/shifts-schedules/patterns/${record.id}/apply`,
      { method: "POST", body: JSON.stringify(applyInput.parse(input)) },
      applyResultSchema,
    ),

  listAssignments: (params: Record<string, string>, signal?: AbortSignal) =>
    apiRequest(
      `/shifts-schedules/assignments?${query(params)}`,
      { signal },
      assignmentList,
    ),
  createAssignment: (input: AssignmentInput) =>
    apiRequest(
      "/shifts-schedules/assignments",
      { method: "POST", body: JSON.stringify(assignmentInput.parse(input)) },
      assignmentSchema,
    ),
  bulkAssign: (input: BulkInput) =>
    apiRequest(
      "/shifts-schedules/assignments/bulk",
      { method: "POST", body: JSON.stringify(bulkInput.parse(input)) },
      bulkResultSchema,
    ),
  updateAssignment: (
    record: AssignmentDto,
    patch: { shiftId?: string; employeeName?: string; note?: string },
  ) =>
    apiRequest(
      `/shifts-schedules/assignments/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      assignmentSchema,
    ),
};
