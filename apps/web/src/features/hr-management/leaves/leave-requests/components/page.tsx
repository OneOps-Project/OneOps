"use client";
import { useState } from "react";
import type {
  LeaveDto,
  LeaveType,
  Status,
} from "@/features/hr-management/leaves/leave-requests/types";
import {
  definition,
  leaveTypeLabels,
  statusLabels,
  statusTones,
} from "@/features/hr-management/leaves/leave-requests/constants";
import { client } from "@/features/hr-management/leaves/leave-requests/api/client";
import {
  leaveRequestsChanged,
  useLeaveRequests,
} from "@/features/hr-management/leaves/leave-requests/hooks/use-leave-requests";
import { LeaveRequestForm } from "@/features/hr-management/leaves/leave-requests/components/request-form";
import {
  Badge,
  Button,
  ErrorLine,
  Input,
  Modal,
  Select,
} from "@/features/hr-management/leaves/leave-requests/components/primitives/ui";

export function ModulePage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [leaveType, setLeaveType] = useState<LeaveType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LeaveDto | null>(null);
  const [cancelling, setCancelling] = useState<LeaveDto | null>(null);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingId, setPendingId] = useState("");

  const filters: Record<string, string> = {};
  if (query.trim()) filters.q = query.trim();
  if (status) filters.status = status;
  if (leaveType) filters.leaveType = leaveType;
  if (from) filters.from = from;
  if (to) filters.to = to;
  const { items, total, loading, error, reload } = useLeaveRequests(filters);

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
      leaveRequestsChanged();
      notify("Đã hủy đơn nghỉ phép.");
      setCancelling(null);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể hủy đơn nghỉ phép",
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="page-header">
          <div>
            <span className="eyebrow">Nhân sự · Nghỉ phép</span>
            <h1>{definition.title}</h1>
            <p>
              Gửi và theo dõi đơn nghỉ phép. Số ngày làm việc được tính tự động;
              đơn đã duyệt hoặc từ chối không sửa được.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>Tạo đơn nghỉ</Button>
        </div>

        <div className="toolbar">
          <Input
            aria-label="Tìm đơn nghỉ phép"
            placeholder="Tìm theo tên hoặc lý do…"
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
          <Select
            aria-label="Lọc loại nghỉ"
            value={leaveType}
            onChange={(event) =>
              setLeaveType(event.target.value as LeaveType | "")
            }
          >
            <option value="">Tất cả loại nghỉ</option>
            {Object.entries(leaveTypeLabels).map(([key, label]) => (
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
            Đang tải đơn nghỉ phép…
          </p>
        ) : !items.length ? (
          <div className="rounded-panel border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">
              {total ? "Không có đơn phù hợp" : "Chưa có đơn nghỉ phép"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {total
                ? "Đổi bộ lọc hoặc khoảng ngày để xem lại."
                : "Tạo đơn khi cần nghỉ phép năm, nghỉ ốm hoặc nghỉ không lương."}
            </p>
            <Button size="sm" onClick={() => setCreating(true)}>
              Tạo đơn nghỉ
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((record) => (
              <li
                key={record.id}
                className="surface flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {record.employeeName}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {record.employeeId}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {leaveTypeLabels[record.leaveType]} · {record.fromDate} →{" "}
                    {record.toDate} · {record.days} ngày làm việc
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
          Mỗi đơn tối đa 60 ngày làm việc. Nhân viên chỉ thấy đơn của mình; quản
          lý thấy toàn bộ và duyệt tại trang Duyệt nghỉ phép.
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
        <Modal title="Tạo đơn nghỉ phép" onClose={() => setCreating(false)}>
          <LeaveRequestForm
            notify={notify}
            onClose={() => setCreating(false)}
          />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa đơn ${editing.employeeName}`}
          onClose={() => setEditing(null)}
        >
          <LeaveRequestForm
            record={editing}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
      {cancelling && (
        <Modal title="Hủy đơn nghỉ phép" onClose={() => setCancelling(null)}>
          <p className="text-sm">
            Đơn nghỉ từ {cancelling.fromDate} đến {cancelling.toDate} sẽ bị hủy
            và không thể khôi phục.
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
