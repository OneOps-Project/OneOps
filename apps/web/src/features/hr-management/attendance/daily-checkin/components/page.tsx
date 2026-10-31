"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  AttendanceDto,
  Status,
} from "@/features/hr-management/attendance/daily-checkin/types";
import {
  definition,
  sourceLabels,
  statusLabels,
  statusTones,
} from "@/features/hr-management/attendance/daily-checkin/constants";
import { client } from "@/features/hr-management/attendance/daily-checkin/api/client";
import {
  checkinChanged,
  useCheckins,
} from "@/features/hr-management/attendance/daily-checkin/hooks/use-checkins";
import { CheckinForm } from "@/features/hr-management/attendance/daily-checkin/components/checkin-form";
import {
  Badge,
  Button,
  ErrorLine,
  Input,
  Modal,
  Select,
} from "@/features/hr-management/attendance/daily-checkin/components/primitives/ui";

function duration(record: AttendanceDto) {
  if (!record.checkOut) return "—";
  const [inHour, inMinute] = record.checkIn.split(":").map(Number);
  const [outHour, outMinute] = record.checkOut.split(":").map(Number);
  const total = outHour * 60 + outMinute - (inHour * 60 + inMinute);
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, "0")}`;
}

export function ModulePage() {
  const params = useSearchParams();
  const initialStatus = params.get("status");
  const [status, setStatus] = useState<Status | "">(
    initialStatus === "OPEN" ||
      initialStatus === "COMPLETE" ||
      initialStatus === "LOCKED"
      ? initialStatus
      : "",
  );
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AttendanceDto | null>(null);
  const [locking, setLocking] = useState<AttendanceDto | null>(null);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);

  const filters: Record<string, string> = {};
  if (status) filters.status = status;
  if (query.trim()) filters.q = query.trim();
  if (from) filters.from = from;
  if (to) filters.to = to;
  const { items, total, loading, error, reload } = useCheckins(filters);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 5000);
  }

  async function confirmLock() {
    if (!locking || pending) return;
    setPending(true);
    setActionError("");
    try {
      await client.lock(locking);
      checkinChanged();
      notify("Đã chốt lượt chấm công.");
      setLocking(null);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể chốt chấm công",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="page-header">
          <div>
            <span className="eyebrow">Nhân sự · Chấm công</span>
            <h1>{definition.title}</h1>
            <p>
              Mỗi nhân sự chỉ có một lượt chấm công cho mỗi ngày. Lượt đã chốt
              không sửa được; điều chỉnh đi qua đơn giải trình.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>Chấm công</Button>
        </div>

        <div className="toolbar">
          <Input
            aria-label="Tìm nhân sự"
            placeholder="Tìm theo tên hoặc ghi chú…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:w-64"
          />
          <Select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) => setStatus(event.target.value as Status | "")}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="OPEN">{statusLabels.OPEN}</option>
            <option value="COMPLETE">{statusLabels.COMPLETE}</option>
            <option value="LOCKED">{statusLabels.LOCKED}</option>
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
            {items.length}/{total} lượt
          </span>
        </div>

        {(error || actionError) && (
          <ErrorLine message={error || actionError} retry={reload} />
        )}

        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải dữ liệu chấm công…
          </p>
        ) : !items.length ? (
          <div className="rounded-panel border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">
              {total ? "Không có lượt phù hợp" : "Chưa có lượt chấm công"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {total
                ? "Đổi bộ lọc hoặc khoảng ngày để xem lại."
                : "Ghi nhận lượt chấm công đầu tiên cho nhân sự."}
            </p>
            <Button size="sm" onClick={() => setCreating(true)}>
              Chấm công
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
                    {record.workDate} · {record.checkIn}–
                    {record.checkOut ?? "?"} · {duration(record)} ·{" "}
                    {sourceLabels[record.source]}
                    {record.note ? ` · ${record.note}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTones[record.status]}>
                    {statusLabels[record.status]}
                  </Badge>
                  {record.status !== "LOCKED" && (
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
                        onClick={() => setLocking(record)}
                      >
                        Chốt
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Giờ vào/ra dùng múi giờ Asia/Ho_Chi_Minh. Nhân viên chỉ thấy lượt chấm
          công của chính mình; quản lý thấy toàn bộ trong phạm vi được cấp.
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
        <Modal title="Chấm công" onClose={() => setCreating(false)}>
          <CheckinForm notify={notify} onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa chấm công ${editing.employeeName}`}
          onClose={() => setEditing(null)}
        >
          <CheckinForm
            record={editing}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
      {locking && (
        <Modal title="Chốt lượt chấm công" onClose={() => setLocking(null)}>
          <p className="text-sm">
            Sau khi chốt, lượt chấm công của “{locking.employeeName}” ngày{" "}
            {locking.workDate} không sửa được nữa. Mọi điều chỉnh phải gửi đơn
            giải trình.
          </p>
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}
          <footer className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLocking(null)}>
              Hủy
            </Button>
            <Button disabled={pending} onClick={() => void confirmLock()}>
              {pending ? "Đang chốt…" : "Chốt"}
            </Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
