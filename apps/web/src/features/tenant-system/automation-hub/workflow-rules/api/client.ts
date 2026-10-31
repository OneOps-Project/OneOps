import {
  rulePageSchema,
  ruleSchema,
  runPageSchema,
  simulationSchema,
  type Rule,
  type RuleDraft,
  type RulePage,
  type Run,
  type Simulation,
} from "@/features/tenant-system/automation-hub/workflow-rules/types";
import { apiRequest } from "@/features/tenant-system/automation-hub/workflow-rules/api/http";

const base = "/automation";

export const client = {
  rules: (signal?: AbortSignal) =>
    apiRequest(`${base}/rules`, { signal }, rulePageSchema),

  runs: (
    query: { ruleId?: string; limit?: number } = {},
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams();
    if (query.ruleId) params.set("ruleId", query.ruleId);
    params.set("limit", String(query.limit ?? 30));
    return apiRequest(
      `${base}/runs?${params.toString()}`,
      { signal },
      runPageSchema,
    );
  },

  create: (draft: RuleDraft) =>
    apiRequest(
      `${base}/rules`,
      { method: "POST", body: JSON.stringify(draft) },
      ruleSchema,
    ),

  update: (rule: Rule, draft: RuleDraft) =>
    apiRequest(
      `${base}/rules/${rule.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ ...draft, version: rule.version }),
      },
      ruleSchema,
    ),

  toggle: (rule: Rule, enabled: boolean) =>
    apiRequest(
      `${base}/rules/${rule.id}/toggle`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled, version: rule.version }),
      },
      ruleSchema,
    ),

  remove: (rule: Rule) =>
    apiRequest(`${base}/rules/${rule.id}?version=${rule.version}`, {
      method: "DELETE",
    }),

  simulate: (input: {
    trigger: RuleDraft["trigger"];
    values: Record<string, string>;
    changed: string[];
  }) =>
    apiRequest(
      `${base}/simulate`,
      { method: "POST", body: JSON.stringify(input) },
      simulationSchema,
    ),
};

export type { Rule, RulePage, Run, Simulation };
