"use client";
import { useState } from "react";
import {
  ACTION_KINDS,
  OPERATORS,
  TRIGGERS,
  WORKFLOW_FIELDS,
  type ActionSpec,
  type Condition,
  type Rule,
  type RuleDraft,
} from "@/features/tenant-system/automation-hub/workflow-rules/types";
import {
  actionLabels,
  fieldLabels,
  operatorLabels,
  triggerLabels,
} from "@/features/tenant-system/automation-hub/workflow-rules/constants";
import { Button } from "@/features/tenant-system/automation-hub/workflow-rules/components/primitives/button";
import {
  Input,
  Select,
  Textarea,
} from "@/features/tenant-system/automation-hub/workflow-rules/components/primitives/forms";

const blankAction = (kind: ActionSpec["kind"]): ActionSpec => {
  switch (kind) {
    case "assign":
      return { kind, assignee: "{{assignee}}" };
    case "status":
      return { kind, status: "Đang làm" };
    case "comment":
      return { kind, body: "Công việc {{code}} đã được cập nhật tự động." };
    case "notify":
      return {
        kind,
        recipients: "{{assignee}}",
        title: "Cập nhật {{code}}",
        body: "Công việc {{code}} vừa thay đổi trạng thái.",
      };
  }
};

/**
 * Editor for one rule. Conditions are combined with AND (like Jira's
 * "all of the following"); actions run in the order they appear.
 */
export function RuleEditor({
  rule,
  draft,
  pending,
  onDraft,
  onSave,
  onCancel,
}: {
  rule?: Rule;
  draft: RuleDraft;
  pending: boolean;
  onDraft: (next: RuleDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<"condition" | "action">("condition");
  const patch = (next: Partial<RuleDraft>) => onDraft({ ...draft, ...next });

  function conditionAt(index: number, next: Partial<Condition>) {
    patch({
      condition: draft.condition.map((item, position) =>
        position === index ? { ...item, ...next } : item,
      ),
    });
  }

  function actionAt(index: number, next: ActionSpec) {
    patch({
      actions: draft.actions.map((item, position) =>
        position === index ? next : item,
      ),
    });
  }

  return (
    <section className="rounded-control border border-border bg-surface p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {rule ? `Sửa quy tắc: ${rule.name}` : "Quy tắc mới"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Khi sự kiện xảy ra và mọi điều kiện đúng, hệ thống chạy lần lượt các
            hành động bên dưới.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Hủy
          </Button>
          <Button
            size="sm"
            loading={pending}
            disabled={
              pending || draft.name.trim().length < 2 || !draft.actions.length
            }
            onClick={onSave}
          >
            Lưu quy tắc
          </Button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Tên quy tắc
          <Input
            value={draft.name}
            maxLength={160}
            placeholder="Nhắc khi công việc quá hạn"
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Sự kiện
          <Select
            value={draft.trigger}
            onChange={(event) =>
              patch({ trigger: event.target.value as RuleDraft["trigger"] })
            }
          >
            {TRIGGERS.map((trigger) => (
              <option value={trigger} key={trigger}>
                {triggerLabels[trigger]}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground md:col-span-2">
          Mô tả
          <Input
            value={draft.description}
            maxLength={500}
            placeholder="Mục đích của quy tắc"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Thứ tự chạy
          <Input
            type="number"
            min={0}
            max={1000}
            value={draft.position}
            onChange={(event) =>
              patch({ position: Number(event.target.value) || 0 })
            }
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Khóa chống lặp (giây)
          <Input
            type="number"
            min={0}
            max={60}
            value={draft.lockSeconds}
            onChange={(event) =>
              patch({ lockSeconds: Number(event.target.value) || 0 })
            }
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={step === "condition" ? "primary" : "secondary"}
          onClick={() => setStep("condition")}
        >
          Điều kiện ({draft.condition.length})
        </Button>
        <Button
          size="sm"
          variant={step === "action" ? "primary" : "secondary"}
          onClick={() => setStep("action")}
        >
          Hành động ({draft.actions.length})
        </Button>
        <label className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={draft.stopOnMatch}
            onChange={(event) => patch({ stopOnMatch: event.target.checked })}
          />
          Dừng sau khi khớp
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />
          Đang bật
        </label>
      </div>

      {step === "condition" ? (
        <div className="mt-3 grid gap-2">
          {draft.condition.map((condition, index) => (
            <div
              className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]"
              key={index}
            >
              <Select
                aria-label={`Trường điều kiện ${index + 1}`}
                value={condition.field}
                onChange={(event) =>
                  conditionAt(index, {
                    field: event.target.value as Condition["field"],
                  })
                }
              >
                {WORKFLOW_FIELDS.map((field) => (
                  <option value={field} key={field}>
                    {fieldLabels[field]}
                  </option>
                ))}
              </Select>
              <Select
                aria-label={`Toán tử điều kiện ${index + 1}`}
                value={condition.operator}
                onChange={(event) =>
                  conditionAt(index, {
                    operator: event.target.value as Condition["operator"],
                  })
                }
              >
                {OPERATORS.map((operator) => (
                  <option value={operator} key={operator}>
                    {operatorLabels[operator]}
                  </option>
                ))}
              </Select>
              <Input
                aria-label={`Giá trị điều kiện ${index + 1}`}
                value={condition.value}
                disabled={condition.operator === "exists"}
                placeholder={
                  condition.operator === "in" ? "A, B, C" : "Giá trị so sánh"
                }
                onChange={(event) =>
                  conditionAt(index, { value: event.target.value })
                }
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  patch({
                    condition: draft.condition.filter(
                      (_, position) => position !== index,
                    ),
                  })
                }
              >
                Bỏ
              </Button>
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabled={draft.condition.length >= 10}
              onClick={() =>
                patch({
                  condition: [
                    ...draft.condition,
                    { field: "status", operator: "is", value: "" },
                  ],
                })
              }
            >
              Thêm điều kiện
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          {draft.actions.map((action, index) => (
            <div
              className="grid gap-2 rounded-control border border-border p-3"
              key={index}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label={`Loại hành động ${index + 1}`}
                  className="max-w-56"
                  value={action.kind}
                  onChange={(event) =>
                    actionAt(
                      index,
                      blankAction(event.target.value as ActionSpec["kind"]),
                    )
                  }
                >
                  {ACTION_KINDS.map((kind) => (
                    <option value={kind} key={kind}>
                      {actionLabels[kind]}
                    </option>
                  ))}
                </Select>
                <Button
                  className="ml-auto"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    patch({
                      actions: draft.actions.filter(
                        (_, position) => position !== index,
                      ),
                    })
                  }
                >
                  Bỏ
                </Button>
              </div>
              {action.kind === "assign" && (
                <Input
                  aria-label="Người được giao"
                  value={action.assignee}
                  onChange={(event) =>
                    actionAt(index, { ...action, assignee: event.target.value })
                  }
                />
              )}
              {action.kind === "status" && (
                <Input
                  aria-label="Trạng thái đích"
                  value={action.status}
                  onChange={(event) =>
                    actionAt(index, { ...action, status: event.target.value })
                  }
                />
              )}
              {action.kind === "comment" && (
                <Textarea
                  aria-label="Nội dung bình luận"
                  value={action.body}
                  onChange={(event) =>
                    actionAt(index, { ...action, body: event.target.value })
                  }
                />
              )}
              {action.kind === "notify" && (
                <div className="grid gap-2">
                  <Input
                    aria-label="Người nhận"
                    value={action.recipients}
                    placeholder="{{assignee}}, quan.ly"
                    onChange={(event) =>
                      actionAt(index, {
                        ...action,
                        recipients: event.target.value,
                      })
                    }
                  />
                  <Input
                    aria-label="Tiêu đề thông báo"
                    value={action.title}
                    onChange={(event) =>
                      actionAt(index, { ...action, title: event.target.value })
                    }
                  />
                  <Textarea
                    aria-label="Nội dung thông báo"
                    value={action.body}
                    onChange={(event) =>
                      actionAt(index, { ...action, body: event.target.value })
                    }
                  />
                </div>
              )}
            </div>
          ))}
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabled={draft.actions.length >= 5}
              onClick={() =>
                patch({ actions: [...draft.actions, blankAction("notify")] })
              }
            >
              Thêm hành động
            </Button>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Dùng được biến: <code>{"{{code}}"}</code>, <code>{"{{name}}"}</code>,{" "}
        <code>{"{{status}}"}</code>, <code>{"{{assignee}}"}</code>,{" "}
        <code>{"{{previous.status}}"}</code>.
      </p>
    </section>
  );
}
