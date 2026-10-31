"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  TRIGGERS,
  WORKFLOW_FIELDS,
  draftOf,
  emptyDraft,
  simulateDraft,
  type Rule,
  type RuleDraft,
  type RulePage,
  type Run,
  type Simulation,
} from "@/features/tenant-system/automation-hub/workflow-rules/types";
import { client } from "@/features/tenant-system/automation-hub/workflow-rules/api/client";
import {
  definition,
  fieldLabels,
  messages,
  outcomeLabels,
  outcomeVariants,
  summarizeAction,
  summarizeCondition,
  triggerLabels,
} from "@/features/tenant-system/automation-hub/workflow-rules/constants";
import { Button } from "@/features/tenant-system/automation-hub/workflow-rules/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/tenant-system/automation-hub/workflow-rules/components/primitives/forms";
import { Badge } from "@/features/tenant-system/automation-hub/workflow-rules/components/primitives/foundations";
import { RuleEditor } from "@/features/tenant-system/automation-hub/workflow-rules/components/rule-editor";

type Tab = "rules" | "runs" | "simulate";

const time = (value: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "chưa chạy";

export function ModulePage() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const requested = params.get("tab");
    return requested === "runs" || requested === "simulate"
      ? requested
      : "rules";
  });
  const [state, setState] = useState<{
    page: RulePage | null;
    runs: Run[];
    key: string;
  }>({ page: null, runs: [], key: "" });
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<{
    rule?: Rule;
    draft: RuleDraft;
  } | null>(null);
  const [deleting, setDeleting] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sample, setSample] = useState(simulateDraft);
  const [simulation, setSimulation] = useState<Simulation | null>(null);

  const key = `${tab}:${revision}`;
  // The key the data was loaded with doubles as the loading flag, so the effect
  // never has to set state synchronously.
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const page = await client.rules(controller.signal);
      const runs =
        tab === "runs" ? (await client.runs({}, controller.signal)).items : [];
      if (controller.signal.aborted) return;
      setState({ page, runs, key });
    };
    void load().catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setState((current) => ({ ...current, key }));
      setError(cause instanceof Error ? cause.message : messages.load);
    });
    return () => controller.abort();
  }, [key, tab]);

  const loading = state.key !== key;
  const rules = loading ? [] : (state.page?.items ?? []);

  async function run(action: () => Promise<unknown>, message: string) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await action();
      setNotice(message);
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể hoàn tất thao tác",
      );
    } finally {
      setPending(false);
    }
  }

  function save() {
    if (!editing) return;
    const { rule, draft } = editing;
    void run(
      () => (rule ? client.update(rule, draft) : client.create(draft)),
      messages.saved,
    ).then(() => setEditing(null));
  }

  async function dryRun() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      setSimulation(await client.simulate(sample));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không chạy thử được quy tắc",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {definition.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Khi công việc thay đổi, hệ thống tự giao việc, chuyển trạng thái,
            bình luận hoặc gửi thông báo theo điều kiện bạn đặt ra.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setRevision((v) => v + 1)}>
            Làm mới
          </Button>
          <Button onClick={() => setEditing({ draft: emptyDraft() })}>
            Tạo quy tắc
          </Button>
        </div>
      </header>

      <dl className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-control border border-border bg-surface px-4 py-3">
          <dt className="text-xs text-muted-foreground">Quy tắc đang bật</dt>
          <dd className="text-xl font-semibold text-foreground">
            {rules.filter((rule) => rule.enabled).length}/{rules.length}
          </dd>
        </div>
        <div className="rounded-control border border-border bg-surface px-4 py-3">
          <dt className="text-xs text-muted-foreground">Lượt đã áp dụng</dt>
          <dd className="text-xl font-semibold text-foreground">
            {state.page?.applied ?? 0}
          </dd>
        </div>
        <div className="rounded-control border border-border bg-surface px-4 py-3">
          <dt className="text-xs text-muted-foreground">Lượt bỏ qua</dt>
          <dd className="text-xl font-semibold text-foreground">
            {state.page?.skipped ?? 0}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={tab === "rules" ? "primary" : "secondary"}
          onClick={() => setTab("rules")}
        >
          Quy tắc
        </Button>
        <Button
          size="sm"
          variant={tab === "runs" ? "primary" : "secondary"}
          onClick={() => setTab("runs")}
        >
          Lượt chạy
        </Button>
        <Button
          size="sm"
          variant={tab === "simulate" ? "primary" : "secondary"}
          onClick={() => setTab("simulate")}
        >
          Chạy thử
        </Button>
        <span className="text-xs text-muted-foreground">{messages.hint}</span>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-control bg-destructive-soft px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-control bg-success-soft px-3 py-2 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải quy tắc…
        </p>
      )}

      {editing && (
        <RuleEditor
          rule={editing.rule}
          draft={editing.draft}
          pending={pending}
          onDraft={(draft) => setEditing({ ...editing, draft })}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {tab === "rules" && !loading && (
        <div className="grid gap-3">
          {!rules.length && (
            <div className="rounded-control border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              {messages.empty}
            </div>
          )}
          {rules.map((rule) => (
            <article
              className="rounded-control border border-border bg-surface p-4"
              key={rule.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      {rule.name}
                    </h2>
                    <Badge variant={rule.enabled ? "success" : "neutral"} dot>
                      {rule.enabled ? "Đang bật" : "Đang tắt"}
                    </Badge>
                    <Badge variant="info">{triggerLabels[rule.trigger]}</Badge>
                    {rule.stopOnMatch && (
                      <Badge variant="warning">Dừng khi khớp</Badge>
                    )}
                  </div>
                  {rule.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {rule.description}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>
                    {rule.runCount} lượt · lần cuối {time(rule.lastRunAt)}
                  </div>
                  <div>Thứ tự {rule.position}</div>
                </div>
              </div>

              <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
                <li>
                  <strong className="text-foreground">Điều kiện:</strong>{" "}
                  {rule.condition.length
                    ? rule.condition.map(summarizeCondition).join(" và ")
                    : "không có, chạy cho mọi công việc"}
                </li>
                <li>
                  <strong className="text-foreground">Hành động:</strong>{" "}
                  {rule.actions.map(summarizeAction).join(" → ")}
                </li>
              </ul>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing({ rule, draft: draftOf(rule) })}
                >
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    void run(
                      () => client.toggle(rule, !rule.enabled),
                      messages.toggled,
                    )
                  }
                >
                  {rule.enabled ? "Tắt" : "Bật"}
                </Button>
                {deleting === rule.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => {
                        void run(
                          () => client.remove(rule),
                          messages.removed,
                        ).then(() => setDeleting(""));
                      }}
                    >
                      Xác nhận xóa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting("")}
                    >
                      Hủy
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleting(rule.id)}
                  >
                    Xóa
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "runs" && !loading && (
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Thời điểm</th>
                <th className="px-3 py-2">Quy tắc</th>
                <th className="px-3 py-2">Công việc</th>
                <th className="px-3 py-2">Kết quả</th>
                <th className="px-3 py-2">Lý do</th>
              </tr>
            </thead>
            <tbody>
              {state.runs.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {time(entry.createdAt)}
                  </td>
                  <td className="px-3 py-2">{entry.ruleName}</td>
                  <td className="px-3 py-2">{entry.code || "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={outcomeVariants[entry.outcome]}>
                      {outcomeLabels[entry.outcome]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {entry.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!state.runs.length && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Chưa có lượt chạy nào. Quy tắc sẽ ghi lại mỗi lần được áp dụng.
            </p>
          )}
        </div>
      )}

      {tab === "simulate" && (
        <div className="grid gap-4">
          <section className="grid gap-3 rounded-control border border-border bg-surface p-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Sự kiện
              <Select
                value={sample.trigger}
                onChange={(event) =>
                  setSample({
                    ...sample,
                    trigger: event.target.value as (typeof TRIGGERS)[number],
                  })
                }
              >
                {TRIGGERS.map((trigger) => (
                  <option value={trigger} key={trigger}>
                    {triggerLabels[trigger]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Trạng thái
              <Input
                value={sample.values.status}
                onChange={(event) =>
                  setSample({
                    ...sample,
                    values: { ...sample.values, status: event.target.value },
                  })
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Người phụ trách
              <Input
                value={sample.values.assignee}
                onChange={(event) =>
                  setSample({
                    ...sample,
                    values: { ...sample.values, assignee: event.target.value },
                  })
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Phạm vi
              <Input
                value={sample.values.scope}
                onChange={(event) =>
                  setSample({
                    ...sample,
                    values: { ...sample.values, scope: event.target.value },
                  })
                }
              />
            </label>
            <fieldset className="md:col-span-2">
              <legend className="text-xs font-medium text-muted-foreground">
                Trường được xem là vừa thay đổi
              </legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {WORKFLOW_FIELDS.map((field) => (
                  <label
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                    key={field}
                  >
                    <input
                      type="checkbox"
                      checked={sample.changed.includes(field)}
                      onChange={(event) =>
                        setSample({
                          ...sample,
                          changed: event.target.checked
                            ? [...sample.changed, field]
                            : sample.changed.filter((item) => item !== field),
                        })
                      }
                    />
                    {fieldLabels[field]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="md:col-span-2">
              <Button
                loading={pending}
                disabled={pending}
                onClick={() => void dryRun()}
              >
                Chạy thử
              </Button>
            </div>
          </section>

          {simulation && (
            <section className="grid gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {simulation.matched} quy tắc khớp với sự kiện đã chọn
              </h2>
              {simulation.results.map((result) => (
                <div
                  className="rounded-control border border-border bg-surface p-3"
                  key={result.ruleId}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-foreground">
                      {result.name}
                    </strong>
                    <Badge variant={result.matched ? "success" : "neutral"}>
                      {result.matched ? "Khớp" : "Không khớp"}
                    </Badge>
                    {!result.enabled && (
                      <Badge variant="warning">Đang tắt</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {result.reason}
                    </span>
                  </div>
                  {result.actions.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {result.actions.map(summarizeAction).join(" → ")}
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
