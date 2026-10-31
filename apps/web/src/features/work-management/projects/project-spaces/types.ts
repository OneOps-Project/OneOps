import { z } from "zod";
const recordInput = z
  .object({
    code: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(500),
    scope: z.string().trim().max(250).default(""),
    status: z.enum([
      "Lên kế hoạch",
      "Đang triển khai",
      "Tạm dừng",
      "Hoàn thành",
    ]),
    date: z.iso.date(),
    assignee: z.string().trim().max(150).default(""),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
const recordPatch = recordInput
  .omit({ scope: true, assignee: true, note: true })
  .partial()
  .extend({
    scope: z.string().trim().max(250).optional(),
    assignee: z.string().trim().max(150).optional(),
    note: z.string().trim().max(2000).optional(),
  });
export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
    q: z.string().trim().max(500).optional(),
    scope: z.string().max(250).optional(),
    status: z.string().max(150).optional(),
    assignee: z.string().trim().max(150).optional(),
  })
  .strict();
export const versionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export const fieldsSchema = z
  .object({
    team: z.string().trim().max(1000).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    objective: z.string().trim().max(20000).optional(),
    members: z.string().trim().max(1000).optional(),
  })
  .strict();
export const createSchema = recordInput.extend({
  fields: fieldsSchema.default({}),
});
export const updateSchema = recordPatch
  .extend({
    fields: fieldsSchema.optional(),
    version: z.number().int().positive(),
  })
  .strict();
export const recordSchema = createSchema.extend({
  id: z.uuid(),
  module: z.literal("projects"),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type RecordInput = z.input<typeof createSchema>;
export type RecordOutput = z.infer<typeof recordSchema>;
export type RecordDto = RecordOutput;
export type ListQuery = z.infer<typeof listQuery>;

/* Sprint planning: mirrors the contracts the API owns for a project board. */
export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "CLOSED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const createSprintSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    goal: z.string().trim().max(2000).default(""),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    capacity: z.number().int().min(0).max(10000).default(0),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
export type NewSprint = z.input<typeof createSprintSchema>;

export const sprintTaskSchema = z.object({
  taskId: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: z.string(),
  assignee: z.string(),
  done: z.boolean(),
});
export type SprintTask = z.infer<typeof sprintTaskSchema>;

export const backlogItemSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  taskId: z.uuid(),
  sprintId: z.uuid().nullable(),
  rank: z.number().int(),
  points: z.number().int(),
  carriedFrom: z.uuid().nullable(),
  carriedTimes: z.number().int(),
  completedAt: z.iso.datetime().nullable(),
  version: z.number().int().positive(),
  task: sprintTaskSchema.nullable(),
});
export type BacklogItem = z.infer<typeof backlogItemSchema>;

export const sprintSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  name: z.string(),
  goal: z.string(),
  status: z.enum(SPRINT_STATUSES),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  capacity: z.number().int(),
  committed: z.number().int(),
  completed: z.number().int(),
  carried: z.number().int(),
  itemCount: z.number().int(),
  doneCount: z.number().int(),
  plannedPoints: z.number().int(),
  donePoints: z.number().int(),
  remainingPoints: z.number().int(),
  daysLeft: z.number().int(),
  committedOnPlan: z.boolean(),
  activatedAt: z.iso.datetime().nullable(),
  closedAt: z.iso.datetime().nullable(),
  note: z.string(),
  commitment: z.object({
    capacity: z.number().int(),
    committed: z.number().int(),
    ratio: z.number(),
    overBy: z.number().int(),
    state: z.enum(["EMPTY", "UNDER", "BALANCED", "OVER"]),
  }),
  items: z.array(backlogItemSchema),
  version: z.number().int().positive(),
});
export type Sprint = z.infer<typeof sprintSchema>;

export const boardSchema = z.object({
  projectId: z.uuid(),
  sprints: z.array(sprintSchema),
  backlog: z.array(backlogItemSchema),
  candidates: z.array(sprintTaskSchema),
  velocity: z.object({
    closedSprints: z.number().int(),
    average: z.number(),
    last: z.number(),
  }),
});
export type Board = z.infer<typeof boardSchema>;
