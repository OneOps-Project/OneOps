import { z } from "zod";

export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "CLOSED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

/** Maximum over-commitment the planner may accept with an explicit override. */
export const COMMITMENT_TOLERANCE = 1.25;

const sprintBase = z
  .object({
    name: z.string().trim().min(1).max(200),
    goal: z.string().trim().max(2000).default(""),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    capacity: z.number().int().min(0).max(10000).default(0),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();

const ordered = <T extends { startDate: string; endDate: string }>(value: T) =>
  value.endDate >= value.startDate;

export const createSprintSchema = sprintBase.refine(ordered, {
  message: "Ngày kết thúc sprint phải sau ngày bắt đầu.",
  path: ["endDate"],
});

export const updateSprintSchema = sprintBase
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict()
  .refine(
    (value) =>
      !value.startDate ||
      !value.endDate ||
      ordered({ startDate: value.startDate, endDate: value.endDate }),
    {
      message: "Ngày kết thúc sprint phải sau ngày bắt đầu.",
      path: ["endDate"],
    },
  );

export const activateSprintSchema = z
  .object({
    version: z.number().int().positive(),
    /** Managers may accept a commitment above capacity; the API records why. */
    overCapacity: z.boolean().default(false),
  })
  .strict();

export const closeSprintSchema = z
  .object({
    version: z.number().int().positive(),
    /** Where unfinished work goes; `null` returns it to the backlog. */
    nextSprintId: z.uuid().nullish(),
  })
  .strict();

export const addItemSchema = z
  .object({
    taskId: z.uuid(),
    points: z.number().int().min(0).max(100).default(0),
    sprintId: z.uuid().nullish(),
  })
  .strict();

export const updateItemSchema = z
  .object({
    points: z.number().int().min(0).max(100),
    version: z.number().int().positive(),
  })
  .strict();

export const moveItemSchema = z
  .object({
    /** Target sprint; `null` moves the row back to the product backlog. */
    sprintId: z.uuid().nullable(),
    /** Zero-based position in the target list, as seen by the planner. */
    index: z.number().int().min(0).max(2000),
    version: z.number().int().positive(),
  })
  .strict();

export const sprintTaskSchema = z.object({
  taskId: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: z.string(),
  assignee: z.string(),
  done: z.boolean(),
});
export type SprintTaskDto = z.infer<typeof sprintTaskSchema>;

export const commitmentSchema = z.object({
  capacity: z.number().int(),
  committed: z.number().int(),
  ratio: z.number(),
  overBy: z.number().int(),
  state: z.enum(["EMPTY", "UNDER", "BALANCED", "OVER"]),
});
export type CommitmentDto = z.infer<typeof commitmentSchema>;

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
export type BacklogItemDto = z.infer<typeof backlogItemSchema>;

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
  commitment: commitmentSchema,
  items: z.array(backlogItemSchema),
  version: z.number().int().positive(),
});
export type SprintDto = z.infer<typeof sprintSchema>;

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
export type BoardDto = z.infer<typeof boardSchema>;

export const metricsSchema = z.object({
  projectId: z.uuid(),
  velocity: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      committed: z.number().int(),
      completed: z.number().int(),
      carried: z.number().int(),
      days: z.number().int(),
    }),
  ),
  averageVelocity: z.number(),
  active: z
    .object({
      id: z.uuid(),
      name: z.string(),
      startDate: z.iso.date(),
      endDate: z.iso.date(),
      committed: z.number().int(),
      remaining: z.number().int(),
      burndown: z.array(
        z.object({ date: z.iso.date(), remaining: z.number().int() }),
      ),
    })
    .nullable(),
});
export type MetricsDto = z.infer<typeof metricsSchema>;

export type CreateSprintInput = z.input<typeof createSprintSchema>;
export type UpdateSprintInput = z.input<typeof updateSprintSchema>;
export type ActivateSprintInput = z.input<typeof activateSprintSchema>;
export type CloseSprintInput = z.input<typeof closeSprintSchema>;
export type AddItemInput = z.input<typeof addItemSchema>;
export type MoveItemInput = z.input<typeof moveItemSchema>;
