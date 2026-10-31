import type {
  WorkflowSnapshot,
  WorkflowField,
} from "../../../../core/events/workflow-events.js";
import type {
  ActionSpec,
  AppliedAction,
  Condition,
  RuleDto,
} from "./dto/workflow-rules.dto.js";

type Values = Record<WorkflowField, string>;

const clean = (value: string) => value.trim();
const same = (left: string, right: string) =>
  clean(left).toLocaleLowerCase("vi") === clean(right).toLocaleLowerCase("vi");
const list = (value: string) =>
  value
    .split(",")
    .map((item) => clean(item))
    .filter(Boolean);

export const valuesOf = (snapshot: WorkflowSnapshot): Values => ({
  status: snapshot.status,
  assignee: snapshot.assignee,
  reviewer: snapshot.reviewer,
  scope: snapshot.scope,
  code: snapshot.code,
  name: snapshot.name,
  date: snapshot.date,
});

function holds(condition: Condition, current: string, past?: string) {
  const wanted = condition.value;
  switch (condition.operator) {
    case "is":
      return same(current, wanted);
    case "isNot":
      return !same(current, wanted);
    case "in":
      return list(wanted).some((item) => same(current, item));
    case "notIn":
      return !list(wanted).some((item) => same(current, item));
    case "contains":
      return clean(current)
        .toLocaleLowerCase("vi")
        .includes(clean(wanted).toLocaleLowerCase("vi"));
    case "exists":
      return Boolean(clean(current));
    // Creation counts as a change, so a fresh record can still match.
    case "changedTo":
      return (
        same(current, wanted) && (past === undefined || !same(past, wanted))
      );
  }
}

export interface Verdict {
  matched: boolean;
  reason: string;
}

/**
 * Evaluates one rule against one snapshot. Every condition must hold; the first
 * failure is reported so the operator can see why a rule did not fire.
 */
export function evaluate(
  rule: RuleDto,
  snapshot: WorkflowSnapshot,
  trigger: "created" | "updated",
): Verdict {
  if (!rule.enabled) return { matched: false, reason: "Quy tắc đang tắt" };
  if (rule.trigger !== trigger)
    return {
      matched: false,
      reason:
        rule.trigger === "created"
          ? "Chỉ chạy khi tạo mới"
          : "Chỉ chạy khi cập nhật",
    };
  const current = valuesOf(snapshot);
  for (const condition of rule.condition) {
    if (
      !holds(
        condition,
        current[condition.field],
        snapshot.previous?.[condition.field],
      )
    )
      return {
        matched: false,
        reason: `Không thỏa: ${condition.field} ${condition.operator} “${condition.value}”`,
      };
  }
  return {
    matched: true,
    reason: rule.condition.length
      ? `Thỏa ${rule.condition.length} điều kiện`
      : "Không có điều kiện",
  };
}

/** Replaces {{field}} placeholders with the current value of that field. */
export function fill(template: string, snapshot: WorkflowSnapshot) {
  const current = valuesOf(snapshot);
  return template.replace(
    /\{\{\s*([a-zA-Z.]+)\s*\}\}/g,
    (match, path: string) => {
      if (path.startsWith("previous.")) {
        const field = path.slice("previous.".length) as WorkflowField;
        return snapshot.previous?.[field] ?? "";
      }
      return field(path) ? current[path as WorkflowField] : match;
    },
  );
}

const field = (path: string): path is WorkflowField =>
  ["status", "assignee", "reviewer", "scope", "code", "name", "date"].includes(
    path,
  );

/** Turns the stored specs into the concrete actions the owner will apply. */
export function compile(
  actions: ActionSpec[],
  snapshot: WorkflowSnapshot,
): AppliedAction[] {
  return actions.map((action) => {
    switch (action.kind) {
      case "assign":
        return {
          kind: "assign" as const,
          assignee: fill(action.assignee, snapshot),
        };
      case "status":
        return {
          kind: "status" as const,
          status: fill(action.status, snapshot),
        };
      case "comment":
        return { kind: "comment" as const, body: fill(action.body, snapshot) };
      case "notify":
        return {
          kind: "notify" as const,
          recipients: list(fill(action.recipients, snapshot)),
          title: fill(action.title, snapshot),
          body: fill(action.body, snapshot),
        };
    }
  });
}

/** Human summary used by the run log and the dry-run panel. */
export function describe(actions: AppliedAction[]) {
  return actions
    .map((action) => {
      switch (action.kind) {
        case "assign":
          return `giao cho ${action.assignee}`;
        case "status":
          return `chuyển trạng thái ${action.status}`;
        case "comment":
          return "thêm bình luận";
        case "notify":
          return `báo cho ${action.recipients.join(", ")}`;
      }
    })
    .join(" · ");
}
