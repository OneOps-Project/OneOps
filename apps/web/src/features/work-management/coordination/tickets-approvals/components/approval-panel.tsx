"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  ApprovalChain,
  ApprovalStep,
  Quorum,
  RecordDto,
  SlaState,
} from "@/features/work-management/coordination/tickets-approvals/types";
import { client } from "@/features/work-management/coordination/tickets-approvals/api/client";
import { recordsChanged } from "@/features/work-management/coordination/tickets-approvals/hooks/use-records";
import { useWorkspace } from "@/features/work-management/coordination/tickets-approvals/components/primitives/workspace";
import { Button } from "@/features/work-management/coordination/tickets-approvals/components/primitives/button";
import { Badge } from "@/features/work-management/coordination/tickets-approvals/components/primitives/foundations";
import {
  Input,
  Select,
  Textarea,
} from "@/features/work-management/coordination/tickets-approvals/components/primitives/forms";
import styles from "@/features/work-management/coordination/tickets-approvals/components/styles.module.css";

const stepTone: Record<string, "neutral" | "info" | "success" | "danger"> = {
  WAITING: "neutral",
  PENDING: "info",
  APPROVED: "success",
  REJECTED: "danger",
  SKIPPED: "neutral",
};
const stepLabel: Record<string, string> = {
  WAITING: "Chờ tới lượt",
  PENDING: "Đang chờ quyết định",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  SKIPPED: "Bỏ qua",
};
const slaTone: Record<SlaState, "neutral" | "warning" | "danger"> = {
  ON_TRACK: "neutral",
  DUE_SOON: "warning",
  OVERDUE: "danger",
};
const quorumLabel: Record<Quorum, string> = {
  ANY: "Một người duyệt là đủ",
  ALL: "Tất cả phải đồng ý",
  MAJORITY: "Quá bán đồng ý",
};

const remaining = (step: ApprovalStep) => {
  if (step.status !== "PENDING" && step.status !== "WAITING") return "";
  const minutes = step.remainingMinutes;
  if (minutes <= 0) return `Quá hạn ${Math.ceil(-minutes / 60)} giờ`;
  if (minutes < 60) return `Còn ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `Còn ${hours} giờ ${rest} phút` : `Còn ${hours} giờ`;
};

/**
 * Approval chain of one request. Every action is server-guarded; the buttons
 * only reflect what the current actor may do so people do not hit dead ends.
 */
export function ApprovalPanel({
  request,
  onChanged,
}: {
  request: RecordDto;
  onChanged: (next: RecordDto) => void;
}) {
  const { notify } = useWorkspace();
  const [chain, setChain] = useState<ApprovalChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [reassigning, setReassigning] = useState(false),
    [people, setPeople] = useState(""),
    [quorum, setQuorum] = useState<Quorum>("ANY"),
    [reassignNote, setReassignNote] = useState("");
  const [cancelling, setCancelling] = useState(false),
    [reason, setReason] = useState("");

  const id = request.id;
  const load = useCallback(
    (signal?: AbortSignal) =>
      client
        .approval(id, signal)
        .then((data) => {
          setChain(data);
          setError("");
        })
        .catch((cause) => {
          if (signal?.aborted) return;
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được quy trình phê duyệt.",
          );
        })
        .finally(() => setLoading(false)),
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function decide(decision: "APPROVE" | "REJECT") {
    if (pending || !chain) return;
    if (decision === "REJECT" && note.trim().length < 3) {
      setError("Từ chối đề xuất cần nêu lý do.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await client.decide(request, decision, note.trim());
      setChain(result.chain);
      setNote("");
      onChanged(result.request);
      recordsChanged();
      notify(
        decision === "APPROVE" ? "Đã ghi nhận đồng ý." : "Đã từ chối đề xuất.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể ghi nhận quyết định.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitReassign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const approvers = people
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!approvers.length) {
      setError("Cần ít nhất một người duyệt.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await client.reassign(
        request,
        approvers,
        quorum,
        reassignNote.trim(),
      );
      setChain(result.chain);
      setReassigning(false);
      setPeople("");
      setReassignNote("");
      onChanged(result.request);
      recordsChanged();
      notify("Đã giao lại bước duyệt.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể giao lại bước duyệt.",
      );
    } finally {
      setPending(false);
    }
  }

  async function submitCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (reason.trim().length < 3) {
      setError("Cần nêu lý do hủy.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await client.cancel(request, reason.trim());
      setChain(result.chain);
      setCancelling(false);
      setReason("");
      onChanged(result.request);
      recordsChanged();
      notify("Đã hủy đề xuất.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể hủy đề xuất.",
      );
    } finally {
      setPending(false);
    }
  }

  if (loading)
    return (
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Đang tải quy trình phê duyệt…
      </p>
    );

  return (
    <section aria-label="Quy trình phê duyệt" className={styles.approval}>
      <div className={styles.approvalHead}>
        <h3>Quy trình phê duyệt</h3>
        {chain?.nextDueAt && (
          <span className="text-sm text-muted-foreground">
            Hạn bước hiện tại:{" "}
            {new Date(chain.nextDueAt).toLocaleString("vi-VN")}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <ol className={styles.chain}>
        {chain?.steps.map((step) => (
          <li key={step.id} className={styles.step}>
            <div className={styles.stepHead}>
              <span className={styles.stepIndex}>{step.position}</span>
              <div className={styles.stepTitle}>
                <strong>{step.name}</strong>
                <span className="text-sm text-muted-foreground">
                  {quorumLabel[step.quorum]} · SLA {step.slaHours} giờ
                </span>
              </div>
              <Badge variant={stepTone[step.status]} dot>
                {stepLabel[step.status]}
              </Badge>
              {(step.status === "PENDING" || step.status === "WAITING") && (
                <Badge variant={slaTone[step.sla]}>{remaining(step)}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {step.approvers.length
                ? step.approvers
                    .map(
                      (vote) =>
                        `${vote.displayName}${
                          vote.decision === "APPROVED"
                            ? " ✓"
                            : vote.decision === "REJECTED"
                              ? " ✕"
                              : ""
                        }`,
                    )
                    .join(" · ")
                : "Chưa giao cụ thể — Quản lý nào cũng có thể quyết định."}
            </p>
            {step.decidedBy && (
              <p className="text-sm text-muted-foreground">
                {step.decidedBy} quyết định lúc{" "}
                {new Date(step.decidedAt ?? step.startedAt).toLocaleString(
                  "vi-VN",
                )}
              </p>
            )}
            {step.note && <p className={styles.stepNote}>{step.note}</p>}
            {step.escalatedAt && (
              <p className={styles.stepNote}>
                Đã chuyển cấp lúc{" "}
                {new Date(step.escalatedAt).toLocaleString("vi-VN")}
              </p>
            )}
          </li>
        ))}
      </ol>

      {chain?.canDecide && (
        <div className={styles.approvalActions}>
          <Textarea
            aria-label="Ý kiến khi quyết định"
            placeholder="Ý kiến (bắt buộc khi từ chối)…"
            rows={2}
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className={styles.actions}>
            <Button disabled={pending} onClick={() => void decide("APPROVE")}>
              Đồng ý
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => void decide("REJECT")}
            >
              Từ chối
            </Button>
          </div>
        </div>
      )}

      {chain?.canManage && chain.status === "Chờ duyệt" && (
        <div className={styles.approvalExtras}>
          {reassigning ? (
            <form className={styles.approvalForm} onSubmit={submitReassign}>
              <p className="text-sm font-medium">Giao lại bước hiện tại</p>
              <Input
                aria-label="Người duyệt mới"
                placeholder="Tên người duyệt, cách nhau bằng dấu phẩy"
                value={people}
                maxLength={500}
                onChange={(event) => setPeople(event.target.value)}
              />
              <Select
                aria-label="Cách tính đủ"
                value={quorum}
                onChange={(event) => setQuorum(event.target.value as Quorum)}
              >
                {Object.entries(quorumLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Ghi chú giao lại"
                placeholder="Ghi chú (không bắt buộc)"
                value={reassignNote}
                maxLength={500}
                onChange={(event) => setReassignNote(event.target.value)}
              />
              <div className={styles.actions}>
                <Button type="submit" variant="secondary" disabled={pending}>
                  Giao lại
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReassigning(false)}
                >
                  Hủy bỏ
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReassigning(true)}
            >
              Giao lại bước duyệt
            </Button>
          )}
        </div>
      )}

      {chain?.canCancel && chain.status === "Chờ duyệt" && (
        <div className={styles.approvalExtras}>
          {cancelling ? (
            <form className={styles.approvalForm} onSubmit={submitCancel}>
              <p className="text-sm font-medium">Hủy đề xuất</p>
              <Input
                aria-label="Lý do hủy"
                placeholder="Lý do hủy (bắt buộc)"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
              <div className={styles.actions}>
                <Button type="submit" variant="destructive" disabled={pending}>
                  Xác nhận hủy
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCancelling(false)}
                >
                  Giữ lại
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelling(true)}
            >
              Hủy đề xuất
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
