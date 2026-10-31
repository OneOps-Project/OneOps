"use client";
import { useState } from "react";
import type {
  PresenceDto,
  Status,
} from "@/features/hr-management/attendance/workforce-board/types";
import {
  definition,
  statusLabels,
  statusTones,
} from "@/features/hr-management/attendance/workforce-board/constants";
import { useWorkforce } from "@/features/hr-management/attendance/workforce-board/hooks/use-workforce";
import { PresenceForm } from "@/features/hr-management/attendance/workforce-board/components/presence-form";
import {
  Badge,
  Button,
  ErrorLine,
  Input,
  Modal,
  Select,
} from "@/features/hr-management/attendance/workforce-board/components/primitives/ui";

const today = () => new Date().toISOString().slice(0, 10);

export function ModulePage() {
  const [workDate, setWorkDate] = useState(today());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PresenceDto | null>(null);
  const [message, setMessage] = useState("");

  const filters: Record<string, string> = { workDate };
  if (query.trim()) filters.q = query.trim();
  if (status) filters.status = status;
  const { items, total, summary, loading, error, reload } =
    useWorkforce(filters);

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 5000);
  }

  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="page-header">
          <div>
            <span className="eyebrow">Nhân sự · Hiện diện</span>
            <h1>{definition.title}</h1>
            <p>
              Trạng thái hiện diện theo ngày của toàn bộ lực lượng: tại văn
              phòng, làm từ xa, nghỉ phép hoặc công tác ngoài.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>Khai báo trạng thái</Button>
        </div>

        <div className="toolbar">
          <Input
            type="date"
            aria-label="Ngày xem bảng"
            value={workDate}
            onChange={(event) => setWorkDate(event.target.value)}
          />
          <Input
            aria-label="Tìm nhân sự"
            placeholder="Tìm theo tên, ca hoặc ghi chú…"
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
          <span className="text-sm text-muted-foreground">
            {items.length}/{total} lượt
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(statusLabels).map(([key, label]) => {
            const count =
              summary.items.find((item) => item.status === key)?.count ?? 0;
            return (
              <Badge key={key} tone={statusTones[key as Status]}>
                {label}: {count}
              </Badge>
            );
          })}
          <Badge tone="neutral">Tổng: {summary.total}</Badge>
        </div>

        {error && <ErrorLine message={error} retry={reload} />}

        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải bảng lực lượng…
          </p>
        ) : !items.length ? (
          <div className="rounded-panel border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">
              {total ? "Không có lượt phù hợp" : "Chưa có dữ liệu hiện diện"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {total
                ? "Đổi bộ lọc để xem lại danh sách."
                : "Khai báo trạng thái đầu tiên cho ngày đang chọn."}
            </p>
            <Button size="sm" onClick={() => setCreating(true)}>
              Khai báo trạng thái
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
                    {record.workDate}
                    {record.shiftLabel ? ` · ${record.shiftLabel}` : ""}
                    {record.note ? ` · ${record.note}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTones[record.status]}>
                    {statusLabels[record.status]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(record)}
                  >
                    Sửa
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Mỗi nhân sự chỉ có một trạng thái cho mỗi ngày. Nhân viên tự khai báo
          và chỉ thấy dòng của mình; quản lý thấy toàn bộ lực lượng.
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
        <Modal
          title="Khai báo trạng thái hiện diện"
          onClose={() => setCreating(false)}
        >
          <PresenceForm
            workDate={workDate}
            notify={notify}
            onClose={() => setCreating(false)}
          />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa trạng thái ${editing.employeeName}`}
          onClose={() => setEditing(null)}
        >
          <PresenceForm
            record={editing}
            workDate={workDate}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
