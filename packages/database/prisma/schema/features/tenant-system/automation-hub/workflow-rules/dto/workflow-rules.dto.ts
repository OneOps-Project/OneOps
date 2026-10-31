import { z } from "zod";
import { WORKFLOW_FIELDS } from "../../../../../core/events/workflow-events.js";

/** Tasks are created or changed; both moments can start a rule. */
export const TRIGGERS = ["created", "updated"] as const;
export const trigger = z.enum(TRIGGERS);

export const field = z.enum(WORKFLOW_FIELDS);

/**
 * `changedTo` is the Jira-style "field changed to value": the field must hold
 * the value now and must not have held it before (creation counts as a change).
 */
export const OPERATORS = [
  "is",
  "isNot",
  "in",
  "notIn",
  "contains",
  "exists",
  "changedTo",
] as const;
export const operator = z.enum(OPERATORS);

export const conditionSchema = z
  .object({
    field,
    operator,
    value: z.string().trim().max(200).default(""),
  })
  .strict();

/** Placeholders resolved against the snapshot: {{code}}, {{name}}, {{status}}, {{assignee}}. */
export const actionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("assign"),
      assignee: z.string().trim().min(1).max(120),
    })
    .strict(),
  z
    .object({
      kind: z.literal("status"),
      status: z.string().trim().min(1).max(60),
    })
    .strict(),
  z
    .object({
      kind: z.literal("comment"),
      body: z.string().trim().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("notify"),
      recipients: z.string().trim().min(1).max(500),
      title: z.string().trim().min(2).max(500),
      body: z.string().trim().min(1).max(2000),
    })
    .strict(),
]);

/** The compiled form the owning feature receives, and the form stored on a run. */
export const appliedActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assign"), assignee: z.string() }).strict(),
  z.object({ kind: z.literal("status"), status: z.string() }).strict(),
  z.object({ kind: z.literal("comment"), body: z.string() }).strict(),
  z
    .object({
      kind: z.literal("notify"),
      recipients: z.array(z.string()),
      title: z.string(),
      body: z.string(),
    })
    .strict(),
]);

export const ruleInput = z
  .object({
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(500).default(""),
    trigger: trigger.default("updated"),
    condition: z.array(conditionSchema).max(10).default([]),
    actions: z.array(actionSchema).min(1).max(5),
    enabled: z.boolean().default(true),
    stopOnMatch: z.boolean().default(false),
    position: z.number().int().min(0).max(1000).default(100),
    lockSeconds: z.number().int().min(0).max(60).default(3),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();

export const rulePatch = ruleInput
  .partial()
  .extend({ version: z.number().int().positive() })
  .strict();

export const toggleInput = z
  .object({ enabled: z.boolean(), version: z.number().int().positive() })
  .strict();

/** Delete carries the version in the query: the body of a DELETE stays empty. */
export const versionQuery = z
  .object({ version: z.coerce.number().int().positive() })
  .strict();

export const runsQuery = z
  .object({
    ruleId: z.uuid().optional(),
    outcome: z.enum(["APPLIED", "SKIPPED", "FAILED"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();

export const ruleSchema = ruleInput
  .extend({
    id: z.uuid(),
    runCount: z.number().int(),
    lastRunAt: z.iso.datetime().nullable(),
    version: z.number().int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const runSchema = z
  .object({
    id: z.uuid(),
    ruleId: z.uuid(),
    ruleName: z.string(),
    entityId: z.uuid(),
    code: z.string(),
    trigger,
    outcome: z.enum(["APPLIED", "SKIPPED", "FAILED", "SIMULATED"]),
    reason: z.string(),
    actions: z.array(appliedActionSchema),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const rulePageSchema = z
  .object({
    items: z.array(ruleSchema),
    applied: z.number().int(),
    skipped: z.number().int(),
  })
  .strict();

export const simulateInput = z
  .object({
    trigger: trigger.default("updated"),
    values: z
      .object({
        code: z.string().trim().max(40).default("CV-000"),
        name: z.string().trim().max(200).default("Công việc mẫu"),
        status: z.string().trim().max(60).default("Mới"),
        assignee: z.string().trim().max(120).default(""),
        reviewer: z.string().trim().max(120).default(""),
        scope: z.string().trim().max(40).default(""),
        date: z.string().trim().max(40).default(""),
      })
      .strict()
      .default({
        code: "CV-000",
        name: "Công việc mẫu",
        status: "Mới",
        assignee: "",
        reviewer: "",
        scope: "",
        date: "",
      }),
    /** Fields the operator pretends changed; other fields keep their value. */
    changed: z.array(field).max(WORKFLOW_FIELDS.length).default([]),
  })
  .strict();

export const simulationResultSchema = z
  .object({
    ruleId: z.uuid(),
    name: z.string(),
    enabled: z.boolean(),
    matched: z.boolean(),
    reason: z.string(),
    actions: z.array(appliedActionSchema),
  })
  .strict();

export const simulationSchema = z
  .object({
    trigger,
    results: z.array(simulationResultSchema),
    matched: z.number().int(),
  })
  .strict();

export type RuleInput = z.infer<typeof ruleInput>;
export type RulePatch = z.infer<typeof rulePatch>;
export type RuleDto = z.infer<typeof ruleSchema>;
export type RunDto = z.infer<typeof runSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type ActionSpec = z.infer<typeof actionSchema>;
export type AppliedAction = z.infer<typeof appliedActionSchema>;
export type SimulateInput = z.infer<typeof simulateInput>;
export type Simulation = z.infer<typeof simulationSchema>;
export type RunsQuery = z.infer<typeof runsQuery>;
