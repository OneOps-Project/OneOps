import { z } from "zod";
import {
  backlogItemSchema,
  boardSchema,
  createSchema,
  createSprintSchema,
  recordSchema,
  sprintSchema,
  type BacklogItem,
  type Board,
  type NewSprint,
  type RecordInput,
  type RecordDto,
  type Sprint,
} from "@/features/work-management/projects/project-spaces/types";
import { apiRequest } from "@/features/work-management/projects/project-spaces/api/http";

const board = (projectId: string, signal?: AbortSignal) =>
  apiRequest("/projects/" + projectId + "/board", { signal }, boardSchema);

const item = (projectId: string, path: string, options: RequestInit) =>
  apiRequest(
    "/projects/" + projectId + "/items" + path,
    options,
    backlogItemSchema,
  );

export const client = {
  async list(signal?: AbortSignal) {
    const items: RecordDto[] = [];
    let page = 1;
    while (true) {
      const result = await apiRequest(
        "/projects?page=" + page + "&pageSize=100",
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
      "/projects/" + record.id,
      {
        method: "PATCH",
        body: JSON.stringify({ ...patch, version: record.version }),
      },
      recordSchema,
    ),
  remove: (record: RecordDto) =>
    apiRequest("/projects/" + record.id, {
      method: "DELETE",
      body: JSON.stringify({ version: record.version }),
    }),
  create: (data: RecordInput) =>
    apiRequest(
      "/projects",
      { method: "POST", body: JSON.stringify(createSchema.parse(data)) },
      recordSchema,
    ),
  board,
  createSprint: (projectId: string, data: NewSprint): Promise<Sprint> =>
    apiRequest(
      "/projects/" + projectId + "/sprints",
      { method: "POST", body: JSON.stringify(createSprintSchema.parse(data)) },
      sprintSchema,
    ),
  activateSprint: (
    projectId: string,
    sprint: Sprint,
    overCapacity = false,
  ): Promise<Sprint> =>
    apiRequest(
      "/projects/" + projectId + "/sprints/" + sprint.id + "/activate",
      {
        method: "POST",
        body: JSON.stringify({ version: sprint.version, overCapacity }),
      },
      sprintSchema,
    ),
  closeSprint: (
    projectId: string,
    sprint: Sprint,
    nextSprintId: string | null,
  ): Promise<Board> =>
    apiRequest(
      "/projects/" + projectId + "/sprints/" + sprint.id + "/close",
      {
        method: "POST",
        body: JSON.stringify({ version: sprint.version, nextSprintId }),
      },
      boardSchema,
    ),
  addItem: (
    projectId: string,
    taskId: string,
    points: number,
    sprintId: string | null = null,
  ): Promise<BacklogItem> =>
    item(projectId, "", {
      method: "POST",
      body: JSON.stringify({ taskId, points, sprintId }),
    }),
  updatePoints: (
    projectId: string,
    entry: BacklogItem,
    points: number,
  ): Promise<BacklogItem> =>
    item(projectId, "/" + entry.id, {
      method: "PATCH",
      body: JSON.stringify({ points, version: entry.version }),
    }),
  moveItem: (
    projectId: string,
    entry: BacklogItem,
    sprintId: string | null,
    index: number,
  ): Promise<Board> =>
    apiRequest(
      "/projects/" + projectId + "/items/" + entry.id + "/move",
      {
        method: "POST",
        body: JSON.stringify({ sprintId, index, version: entry.version }),
      },
      boardSchema,
    ),
  removeItem: (projectId: string, entry: BacklogItem) =>
    apiRequest("/projects/" + projectId + "/items/" + entry.id, {
      method: "DELETE",
      body: JSON.stringify({ version: entry.version }),
    }),
};
