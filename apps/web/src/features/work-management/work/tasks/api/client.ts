import { z } from "zod";
import {
  createSchema,
  recordSchema,
  changeStatusSchema,
  reassignSchema,
  type RecordInput,
  type RecordDto,
  type ChangeStatusInput,
  type ReassignInput,
  type MyTaskDto,
  type EmployeeTaskStats,
} from "@/features/work-management/work/tasks/types";
import { apiRequest } from "@/features/work-management/work/tasks/api/http";

export const client = {
  async list(signal?: AbortSignal) {
    const items: RecordDto[] = [];
    let page = 1;
    while (true) {
      const result = await apiRequest(
        "/tasks?page=" + page + "&pageSize=100",
        { signal },
        z.object({
          items: z.array(recordSchema),
          total: z.number(),
          page: z.number(),
          pageSize: z.number(),
        }),
      );
      items.push(...result.items);
      if (items.length >= result.total || !result.items.length) return items;
      page++;
    }
  },

  update: (record: RecordDto, patch: Partial<RecordInput>) =>
    apiRequest(
      "/tasks/" + record.id,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      recordSchema,
    ),

  remove: (record: RecordDto) =>
    apiRequest("/tasks/" + record.id, {
      method: "DELETE",
      body: JSON.stringify({ version: record.version }),
    }),

  create: (data: RecordInput) =>
    apiRequest(
      "/tasks",
      { method: "POST", body: JSON.stringify(createSchema.parse(data)) },
      recordSchema,
    ),

  // ROUND1-4: Thay đổi trạng thái
  changeStatus: (id: string, input: ChangeStatusInput) =>
    apiRequest(
      `/tasks/${id}/change-status`,
      {
        method: "POST",
        body: JSON.stringify(changeStatusSchema.parse(input)),
      },
      recordSchema,
    ),

  // ROUND1-5: Việc của tôi
  getMyTasks: (userId: string) =>
    apiRequest(
      "/tasks/my-tasks",
      {
        headers: { "x-user-id": userId },
      },
      z.array(
        recordSchema.extend({
          role: z.enum(["assignee", "reviewer"]),
          deadlineStatus: z.enum(["overdue", "upcoming", "normal"]),
        }),
      ),
    ),

  // ROUND1-6: Giao lại task
  reassign: (id: string, input: ReassignInput) =>
    apiRequest(
      `/tasks/${id}/reassign`,
      {
        method: "POST",
        body: JSON.stringify(reassignSchema.parse(input)),
      },
      recordSchema,
    ),

  // ROUND1-6: Thống kê task của nhân viên
  getEmployeeStats: (employeeId: string) =>
    apiRequest(
      `/tasks/employee-stats/${employeeId}`,
      {},
      z.object({
        employeeId: z.string(),
        openTasks: z.number(),
        inProgressTasks: z.number(),
      }),
    ),

  // ROUND1-7: Danh sách task cần giao lại
  getFlaggedTasks: () =>
    apiRequest("/tasks/flagged", {}, z.array(recordSchema)),

  // ROUND1-4: Tỷ lệ hoàn thành
  getCompletionRate: (scope?: string) =>
    apiRequest(
      `/tasks/completion-rate${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`,
      {},
      z.object({
        total: z.number(),
        completed: z.number(),
        rate: z.number(),
      }),
    ),

  // ROUND1-2: Kiểm tra task trùng
  checkSimilarTasks: (assignee: string, name: string) =>
    apiRequest(
      `/tasks/check-similar?assignee=${encodeURIComponent(assignee)}&name=${encodeURIComponent(name)}`,
      {},
      z.array(recordSchema),
    ),
};
