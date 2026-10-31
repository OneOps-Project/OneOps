import { z } from "zod";

/** Mirrors the API contract in the workflow-rules DTO. */
export const WORKFLOW_FIELDS = [
  "status",
  "assignee",
  "reviewer",
  "scope",
  "code",
  "name",
  "date",
] as const;

export const TRIGGERS = ["created", "updated"] as const;
export const OPERATORS = [
  "is",
  "isNot",
  "in",
  "notIn",
  "contains",
  "exists",
  "changedTo",
] as const;
export const ACTION_KINDS = ["assign", "status", "comment", "notify"] as const;
export const OUTCOMES = ["APPLIED", "SKIPPED", "FAILED", "SIMULATED"] as const;

export const conditionSchema = z
  .object({
    field: z.enum(WORKFLOW_FIELDS),
    operator: z.enum(OPERATORS),
    value: z.string(),
  })
  .strict();

export const actionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assign"), assignee: z.string() }).strict(),
  z.object({ kind: z.literal("status"), status: z.string() }).strict(),
  z.object({ kind: z.literal("comment"), body: z.string() }).strict(),
  z
    .object({
      kind: z.literal("notify"),
      recipients: z.string(),
      title: z.string(),
      body: z.string(),
    })
    .strict(),
]);

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

export const ruleSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    description: z.string(),
    trigger: z.enum(TRIGGERS),
    condition: z.array(conditionSchema),
    actions: z.array(actionSchema),
    enabled: z.boolean(),
    stopOnMatch: z.boolean(),
    position: z.number().int(),
    lockSeconds: z.number().int(),
    note: z.string(),
    runCount: z.number().int(),
    lastRunAt: z.iso.datetime().nullable(),
    version: z.number().int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const rulePageSchema = z
  .object({
    items: z.array(ruleSchema),
    applied: z.number().int(),
    skipped: z.number().int(),
  })
  .strict();

export const runSchema = z
  .object({
    id: z.uuid(),
    ruleId: z.uuid(),
    ruleName: z.string(),
    entityId: z.uuid(),
    code: z.string(),
    trigger: z.enum(TRIGGERS),
    outcome: z.enum(OUTCOMES),
    reason: z.string(),
    actions: z.array(appliedActionSchema),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const runPageSchema = z.object({ items: z.array(runSchema) }).strict();

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
    trigger: z.enum(TRIGGERS),
    results: z.array(simulationResultSchema),
    matched: z.number().int(),
  })
  .strict();

export type Condition = z.infer<typeof conditionSchema>;
export type ActionSpec = z.infer<typeof actionSchema>;
export type AppliedAction = z.infer<typeof appliedActionSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type RulePage = z.infer<typeof rulePageSchema>;
export type Run = z.infer<typeof runSchema>;
export type Simulation = z.infer<typeof simulationSchema>;

/** What the editor sends: the compiled actions stay server-side. */
export interface RuleDraft {
  name: string;
  description: string;
  trigger: (typeof TRIGGERS)[number];
  condition: Condition[];
  actions: ActionSpec[];
  enabled: boolean;
  stopOnMatch: boolean;
  position: number;
  lockSeconds: number;
  note: string;
}

export const emptyDraft = (): RuleDraft => ({
  name: "",
  description: "",
  trigger: "updated",
  condition: [],
  actions: [
    {
      kind: "notify",
      recipients: "{{assignee}}",
      title: "Cập nhật {{code}}",
      body: "Công việc {{code}} vừa thay đổi.",
    },
  ],
  enabled: true,
  stopOnMatch: false,
  position: 100,
  lockSeconds: 3,
  note: "",
});

export const draftOf = (rule: Rule): RuleDraft => ({
  name: rule.name,
  description: rule.description,
  trigger: rule.trigger,
  condition: rule.condition,
  actions: rule.actions,
  enabled: rule.enabled,
  stopOnMatch: rule.stopOnMatch,
  position: rule.position,
  lockSeconds: rule.lockSeconds,
  note: rule.note,
});

export const simulateDraft = {
  trigger: "updated" as (typeof TRIGGERS)[number],
  values: {
    code: "CV-104",
    name: "Hoàn thiện báo giá",
    status: "Đang làm",
    assignee: "lan.nguyen",
    reviewer: "",
    scope: "Nội bộ",
    date: "",
  },
  changed: [] as (typeof WORKFLOW_FIELDS)[number][],
};
