"use client";
import { useState } from "react";
import { TaskComments } from "@/features/work-management/work/task-comments";
import type {
  ProposalInput,
  RecordDto,
  TaskProposal,
} from "@/features/work-management/work/tasks/types";
import {
  definition,
  isLate,
  statusTone,
} from "@/features/work-management/work/tasks/constants";
import { client } from "@/features/work-management/work/tasks/api/client";
import { ApiError } from "@/features/work-management/work/tasks/api/http";
import { workflow } from "@/features/work-management/work/tasks/api/workflow";
import { useTaskState } from "@/features/work-management/work/tasks/hooks/use-task-state";
import { recordsChanged } from "@/features/work-management/work/tasks/hooks/use-records";
import {
  Modal,
  useWorkspace,
} from "@/features/work-management/work/tasks/components/primitives/workspace";
import { Button } from "@/features/work-management/work/tasks/components/primitives/button";
import { Badge } from "@/features/work-management/work/tasks/components/primitives/foundations";
import { Input } from "@/features/work-management/work/tasks/components/primitives/forms";
import {
  TaskActions,
  type TransitionRequest,
} from "@/features/work-management/work/tasks/components/task-actions";
import { TaskProposals } from "@/features/work-management/work/tasks/components/task-proposals";
import { TaskLinks } from "@/features/work-management/work/tasks/components/task-links";
import { TaskHistory } from "@/features/work-management/work/tasks/components/task-history";
import styles from "@/features/work-management/work/tasks/components/styles.module.css";

export function TaskDetail({
  task,
  candidates,
  onClose,
  onEdit,
  onDelete,
  onChanged,
}: {
  task: RecordDto;
  /** Other tasks of the workspace, offered when adding a link. */
  candidates: readonly RecordDto[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Lets the board refresh its blocker counts after any write here. */
  onChanged?: () => void;
}) {
  const { notify } = useWorkspace();
  const { data, loading, error, reload, apply } = useTaskState(task.id);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [overrideBlocked, setOverrideBlocked] = useState(false);
  const [ticks, setTicks] = useState<Record<string, boolean>>({});

  async function transition(input: TransitionRequest) {
    if (pending) return;
    setPending(true);
    setActionError("");
    setOverrideBlocked(false);
    try {
      const next = await workflow.transition(task.id, {
        toStatus: input.to,
        version: data?.task.version ?? task.version,
        reason: input.reason,
        overrideReason: input.overrideReason,
      });
      apply(next);
      recordsChanged();
      onChanged?.();
      notify(`Đã chuyển sang “${input.to}”.`);
    } catch (cause) {
      // Only the API explains itself; anything else is an unreadable payload.
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError(0, "Không thể chuyển trạng thái. Vui lòng thử lại.");
      setActionError(failure.message);
      // The API answers 422 with the blocking criteria; a manager may override.
      if (failure.status === 422) setOverrideBlocked(true);
      // Lets the prompting dialog keep the typed reason on screen.
      throw failure;
    } finally {
      setPending(false);
    }
  }

  async function propose(input: ProposalInput) {
    setPending(true);
    setActionError("");
    try {
      await workflow.propose(task.id, input);
      reload();
      recordsChanged();
      notify("Đã gửi đề xuất tới Quản lý.");
    } catch (cause) {
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError(0, "Không thể gửi đề xuất. Vui lòng thử lại.");
      setActionError(failure.message);
      throw failure;
    } finally {
      setPending(false);
    }
  }

  async function decide(
    proposal: TaskProposal,
    decision: "APPROVE" | "REJECT",
    reason?: string,
  ) {
    setPending(true);
    setActionError("");
    try {
      await workflow.decide(proposal.id, { decision, reason });
      reload();
      recordsChanged();
      notify(
        decision === "APPROVE"
          ? "Đã chấp thuận đề xuất."
          : "Đã từ chối đề xuất.",
      );
    } catch (cause) {
      const failure =
        cause instanceof ApiError
          ? cause
          : new ApiError(0, "Không thể xử lý đề xuất. Vui lòng thử lại.");
      setActionError(failure.message);
      throw failure;
    } finally {
      setPending(false);
    }
  }

  async function saveChecklist(next: RecordDto["fields"]["checklist"]) {
    if (pending) return false;
    setPending(true);
    setActionError("");
    try {
      await client.update(task, {
        fields: { ...task.fields, checklist: next },
      });
      recordsChanged();
      return true;
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể lưu đầu việc",
      );
      return false;
    } finally {
      setPending(false);
    }
  }

  /** A tick shows at once; the write follows so the box never snaps back. */
  async function toggleCheck(itemId: string) {
    if (pending) return;
    const saved = task.fields.checklist ?? [];
    const item = saved.find((row) => row.id === itemId);
    if (!item) return;
    const done = !(ticks[itemId] ?? item.done);
    setTicks((current) => ({ ...current, [itemId]: done }));
    const ok = await saveChecklist(
      saved.map((row) => (row.id === itemId ? { ...row, done } : row)),
    );
    if (ok) return;
    setTicks((current) => {
      const reverted = { ...current };
      delete reverted[itemId];
      return reverted;
    });
  }

  const checklist = (task.fields.checklist ?? []).map((item) =>
    ticks[item.id] === undefined ? item : { ...item, done: ticks[item.id] },
  );
  const done = checklist.filter((item) => item.done).length;
  const late = isLate(task);

  return (
    <Modal
      title={task.name}
      description={`${task.code} · ${task.status}`}
      className="max-w-3xl"
      onClose={onClose}
    >
      <div className={styles.details}>
        <div className={styles.actions}>
          <Badge variant={statusTone[task.status]} dot>
            {task.status}
          </Badge>
          {late && <Badge variant="danger">Quá hạn</Badge>}
          {task.fields.priority && (
            <Badge variant="neutral">{task.fields.priority}</Badge>
          )}
          {typeof task.fields.progress === "number" && (
            <Badge variant="brand">{task.fields.progress}%</Badge>
          )}
        </div>

        <dl className={styles.meta}>
          <div>
            <dt>{definition.dateLabel}</dt>
            <dd className={late ? "text-destructive" : undefined}>
              {task.date}
            </dd>
          </div>
          <div>
            <dt>{definition.personLabel}</dt>
            <dd>{task.assignee || "Chưa phân công"}</dd>
          </div>
          <div>
            <dt>{definition.reviewerLabel}</dt>
            <dd>{task.reviewer || "Quản lý phụ trách"}</dd>
          </div>
          {task.fields.project && (
            <div>
              <dt>Dự án</dt>
              <dd>{task.fields.project}</dd>
            </div>
          )}
          {task.fields.startDate && (
            <div>
              <dt>Ngày bắt đầu</dt>
              <dd>{task.fields.startDate}</dd>
            </div>
          )}
          {task.fields.tags && (
            <div>
              <dt>Nhãn</dt>
              <dd>{task.fields.tags}</dd>
            </div>
          )}
        </dl>

        <p className={styles.note}>{task.note || "Chưa có mô tả."}</p>

        <section aria-label="Chuyển trạng thái">
          <h3 className="mb-2 text-sm font-semibold">Chuyển trạng thái</h3>
          {loading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Đang tải quy trình…
            </p>
          ) : error ? (
            <div role="alert" className={styles.error}>
              {error}
              <Button variant="ghost" size="sm" onClick={reload}>
                Thử lại
              </Button>
            </div>
          ) : (
            <TaskActions
              allowed={data?.allowed ?? []}
              pending={pending}
              allowOverride={overrideBlocked}
              onTransition={transition}
            />
          )}
          {data?.pendingProposal && (
            <p className="mt-2 text-sm text-muted-foreground">
              Đang chờ Quản lý xử lý đề xuất; trạng thái tạm khóa.
            </p>
          )}
        </section>

        {actionError && (
          <p role="alert" className={styles.error}>
            {actionError}
          </p>
        )}

        <TaskLinks task={task} candidates={candidates} onChanged={onChanged} />

        <section aria-label="Đầu việc">
          <h3 className="text-sm font-semibold">
            Checklist ({done}/{checklist.length})
          </h3>
          {checklist.map((item) => (
            <label className={styles.check} key={item.id}>
              <input
                type="checkbox"
                checked={item.done}
                disabled={pending}
                onChange={() => void toggleCheck(item.id)}
              />
              {item.title}
            </label>
          ))}
          <form
            className={styles.check}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const title = String(
                new FormData(form).get("checklist") || "",
              ).trim();
              if (!title) return;
              void saveChecklist([
                ...checklist,
                { id: crypto.randomUUID(), title, done: false },
              ]).then((ok) => {
                if (ok) form.reset();
              });
            }}
          >
            <label className="w-full">
              Thêm đầu việc
              <Input name="checklist" required maxLength={500} />
            </label>
            <Button type="submit" variant="secondary" disabled={pending}>
              Thêm
            </Button>
          </form>
        </section>

        <TaskProposals
          taskId={task.id}
          status={task.status}
          pendingProposal={data?.pendingProposal ?? null}
          pending={pending}
          onPropose={propose}
          onDecide={decide}
        />

        <section aria-label="Lịch sử">
          <h3 className="mb-2 text-sm font-semibold">Lịch sử</h3>
          <TaskHistory items={data?.history ?? []} />
        </section>

        <TaskComments
          taskId={task.id}
          // Each transition records a system comment; refetch to show it here.
          refreshKey={data?.history.length ?? 0}
        />
      </div>
      <footer>
        <Button variant="ghost" onClick={onDelete}>
          Xóa
        </Button>
        <Button variant="secondary" onClick={onEdit}>
          Chỉnh sửa
        </Button>
        <Button onClick={onClose}>Đóng</Button>
      </footer>
    </Modal>
  );
}
