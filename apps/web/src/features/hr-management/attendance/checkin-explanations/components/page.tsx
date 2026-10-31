"use client";
import { useState } from "react";
import type {
  ExplanationDto,
  Status,
} from "@/features/hr-management/attendance/checkin-explanations/types";
import {
  definition,
  statusLabels,
  statusTones,
  typeLabels,
} from "@/features/hr-management/attendance/checkin-explanations/constants";
import { client } from "@/features/hr-management/attendance/checkin-explanations/api/client";
import {
  explanationsChanged,
  useExplanations,
} from "@/features/hr-management/attendance/checkin-explanations/hooks/use-explanations";
import {
  DecisionForm,
  ExplanationForm,
} from "@/features/hr-management/attendance/checkin-explanations/components/forms";
import {
  Badge,
  Button,
  ErrorLine,
  Input,
  Modal,
  Select,
} from "@/features/hr-management/attendance/checkin-explanations/components/primitives/ui";

export function ModulePage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ExplanationDto | null>(null);
  const [deciding, setDeciding] = useState<{
    record: ExplanationDto;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);
  const [cancelling, setCancelling] = useState<ExplanationDto | null>(null);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingId, setPendingId] = useState("");

  const filters: Record<string, string> = {};
  if (query.trim()) filters.q = query.trim();
  if (status) filters.status = status;
  if (from) filters.from = from;
  if (to) filters.to = to;
  const { items, total, loading, error, reload } = useExplanations(filters);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 5000);
  }

  async function confirmCancel() {
    if (!cancelling || pendingId) return;
    setPendingId(cancelling.id);
    setActionError("");
    try {
      await client.cancel(cancelling);
      explanationsChanged();
      notify("Đã hủy đơn giải trình.");
      setCancelling(null);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể hủy đơn giải trình",
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1>{definition.title}</h1>
            <p className="text-sm text-muted-foreground">
              Đơn giải trình cho lượt chấm công thiếu hoặc sai. Quản lý duyệt
              hoặc từ chối; đơn đã xử lý không sửa được.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>Gửi giải trình</Button>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Tìm đơn giải trình"
            placeholder="Tìm theo tên hoặc nội dung…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:w-56"
          />
          <Select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) => setStatus(event.target.value as Status | "")}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            aria-label="Từ ngày"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            type="date"
            aria-label="Đến ngày"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <span className="text-sm text-muted-foreground">
            {items.length}/{total} đơn
          </span>
        </div>

        {(error || actionError) && (
          <ErrorLine message={error || actionError} retry={reload} />
        )}

        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải đơn giải trình…
          </p>
        ) : !items.length ? (
          <div className="rounded-panel border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">
              {total ? "Không có đơn phù hợp" : "Chưa có đơn giải trình"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {total
                ? "Đổi bộ lọc hoặc khoảng ngày để xem lại."
                : "Gửi đơn khi quên chấm công vào/ra hoặc cần điều chỉnh giờ."}
            </p>
            <Button size="sm" onClick={() => setCreating(true)}>
              Gửi giải trình
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {record.employeeName}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {record.employeeId}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {record.workDate} · {typeLabels[record.type]}
                    {record.requestedCheckIn
                      ? ` · vào ${record.requestedCheckIn}`
                      : ""}
                    {record.requestedCheckOut
                      ? ` · ra ${record.requestedCheckOut}`
                      : ""}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {record.reason}
                  </span>
                  {record.decidedBy ? (
                    <span className="block text-xs text-muted-foreground">
                      {record.decidedBy} xử lý
                      {record.decisionNote ? ` · ${record.decisionNote}` : ""}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTones[record.status]}>
                    {statusLabels[record.status]}
                  </Badge>
                  {record.status === "PENDING" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(record)}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeciding({ record, decision: "APPROVED" })
                        }
                      >
                        Duyệt
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeciding({ record, decision: "REJECTED" })
                        }
                      >
                        Từ chối
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelling(record)}
                      >
                        Hủy đơn
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Mỗi nhân sự chỉ có một đơn cho mỗi loại giải trình trong một ngày.
          Nhân viên chỉ thấy đơn của mình; quản lý thấy toàn bộ.
        </p>
      </section>

      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Đóng thông báo" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}

      {creating && (
        <Modal title="Gửi đơn giải trình" onClose={() => setCreating(false)}>
          <ExplanationForm notify={notify} onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa đơn ${editing.employeeName}`}
          onClose={() => setEditing(null)}
        >
          <ExplanationForm
            record={editing}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
      {deciding && (
        <Modal
          title={
            deciding.decision === "APPROVED"
              ? "Duyệt đơn giải trình"
              : "Từ chối đơn giải trình"
          }
          onClose={() => setDeciding(null)}
        >
          <DecisionForm
            record={deciding.record}
            decision={deciding.decision}
            notify={notify}
            onClose={() => setDeciding(null)}
          />
        </Modal>
      )}
      {cancelling && (
        <Modal title="Hủy đơn giải trình" onClose={() => setCancelling(null)}>
          <p className="text-sm">
            Đơn giải trình ngày {cancelling.workDate} sẽ bị hủy và không thể
            khôi phục.
          </p>
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}
          <footer className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelling(null)}>
              Giữ đơn
            </Button>
            <Button
              variant="destructive"
              disabled={pendingId === cancelling.id}
              onClick={() => void confirmCancel()}
            >
              {pendingId === cancelling.id ? "Đang hủy…" : "Hủy đơn"}
            </Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
