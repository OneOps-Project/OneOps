"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  AssignmentDto,
  PatternDto,
  ShiftDto,
  Status,
} from "@/features/hr-management/attendance/shifts-schedules/types";
import {
  definition,
  sourceLabels,
  statusLabels,
  weekdayLabels,
} from "@/features/hr-management/attendance/shifts-schedules/constants";
import { client } from "@/features/hr-management/attendance/shifts-schedules/api/client";
import {
  shiftsChanged,
  useAssignments,
  usePatterns,
  useShifts,
} from "@/features/hr-management/attendance/shifts-schedules/hooks/use-shifts";
import {
  PatternForm,
  ShiftForm,
} from "@/features/hr-management/attendance/shifts-schedules/components/shift-forms";
import {
  AssignmentForm,
  BulkAssignForm,
  PatternApplyForm,
} from "@/features/hr-management/attendance/shifts-schedules/components/assignment-forms";
import {
  Badge,
  Button,
  ErrorLine,
  Input,
  Modal,
  Select,
} from "@/features/hr-management/attendance/shifts-schedules/components/primitives/ui";

type Tab = "shifts" | "patterns" | "assignments";

const tabs: { key: Tab; label: string }[] = [
  { key: "shifts", label: "Ca làm" },
  { key: "patterns", label: "Mẫu tuần" },
  { key: "assignments", label: "Lịch gán" },
];

const weekdayName = (weekday: number) =>
  weekdayLabels[weekday as keyof typeof weekdayLabels] ?? `Thứ ${weekday}`;

function inputOf(record: ShiftDto, status: Status) {
  return {
    name: record.name,
    startTime: record.startTime,
    endTime: record.endTime,
    breakMinutes: record.breakMinutes,
    nightShift: record.nightShift,
    effectiveFrom: record.effectiveFrom,
    note: record.note,
    status,
  };
}

function ShiftsTab({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ShiftDto | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [actionError, setActionError] = useState("");

  const filters: Record<string, string> = {};
  if (query.trim()) filters.q = query.trim();
  if (status) filters.status = status;
  const { items, total, loading, error, reload } = useShifts(filters);

  async function toggle(record: ShiftDto) {
    if (pendingId) return;
    setPendingId(record.id);
    setActionError("");
    try {
      const next: Status = record.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await client.updateShift(record, inputOf(record, next));
      shiftsChanged();
      notify(next === "ACTIVE" ? "Đã kích hoạt ca." : "Đã ngừng áp dụng ca.");
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể đổi trạng thái ca",
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Tìm ca làm"
            placeholder="Tìm theo tên hoặc ghi chú…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:w-56"
          />
          <Select
            aria-label="Lọc trạng thái ca"
            value={status}
            onChange={(event) => setStatus(event.target.value as Status | "")}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">{statusLabels.ACTIVE}</option>
            <option value="INACTIVE">{statusLabels.INACTIVE}</option>
          </Select>
          <span className="text-sm text-muted-foreground">
            {items.length}/{total} ca
          </span>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          Thêm ca
        </Button>
      </div>
      {(error || actionError) && (
        <ErrorLine message={error || actionError} retry={reload} />
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải ca làm…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa có ca làm</h2>
          <p className="text-sm text-muted-foreground">
            Khai báo khung giờ ca để xếp lịch cho nhân sự.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Thêm ca
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((shift) => (
            <li
              key={shift.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <span className="block text-sm font-semibold">
                  {shift.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {shift.startTime}–{shift.endTime}
                  {shift.nightShift ? " (qua đêm)" : ""} · {shift.hours}h làm
                  việc · nghỉ {shift.breakMinutes}p · từ {shift.effectiveFrom}
                  {shift.note ? ` · ${shift.note}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {shift.assignmentCount} lượt gán
                </span>
                <Badge tone={shift.status === "ACTIVE" ? "success" : "neutral"}>
                  {statusLabels[shift.status]}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(shift)}
                >
                  Sửa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === shift.id}
                  onClick={() => void toggle(shift)}
                >
                  {shift.status === "ACTIVE" ? "Ngừng" : "Kích hoạt"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <Modal title="Thêm ca làm" onClose={() => setCreating(false)}>
          <ShiftForm notify={notify} onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title={`Sửa ${editing.name}`} onClose={() => setEditing(null)}>
          <ShiftForm
            record={editing}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function PatternsTab({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PatternDto | null>(null);
  const [applying, setApplying] = useState<PatternDto | null>(null);

  const filters: Record<string, string> = {};
  if (query.trim()) filters.q = query.trim();
  const patterns = usePatterns(filters);
  const shifts = useShifts({});
  const names = new Map(shifts.items.map((shift) => [shift.id, shift]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Tìm mẫu tuần"
            placeholder="Tìm theo tên mẫu…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:w-56"
          />
          <span className="text-sm text-muted-foreground">
            {patterns.items.length}/{patterns.total} mẫu
          </span>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          Thêm mẫu
        </Button>
      </div>
      {patterns.error && (
        <ErrorLine message={patterns.error} retry={patterns.reload} />
      )}
      {patterns.loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải mẫu tuần…
        </p>
      ) : !patterns.items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa có mẫu tuần</h2>
          <p className="text-sm text-muted-foreground">
            Mẫu tuần giúp áp dụng một bộ ca cố định cho nhiều nhân sự trong
            nhiều ngày.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Thêm mẫu
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {patterns.items.map((pattern) => (
            <li
              key={pattern.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <span className="block text-sm font-semibold">
                  {pattern.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {pattern.slots
                    .map(
                      (slot) =>
                        `${weekdayName(slot.weekday)}: ${
                          names.get(slot.shiftId)?.name ?? "Ca đã xóa"
                        }`,
                    )
                    .join(" · ")}
                  {pattern.note ? ` · ${pattern.note}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={pattern.status === "ACTIVE" ? "success" : "neutral"}
                >
                  {statusLabels[pattern.status]}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setApplying(pattern)}
                >
                  Áp dụng
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(pattern)}
                >
                  Sửa
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <Modal title="Thêm mẫu tuần" onClose={() => setCreating(false)}>
          <PatternForm
            shifts={shifts.items}
            notify={notify}
            onClose={() => setCreating(false)}
          />
        </Modal>
      )}
      {editing && (
        <Modal title={`Sửa ${editing.name}`} onClose={() => setEditing(null)}>
          <PatternForm
            record={editing}
            shifts={shifts.items}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
      {applying && (
        <Modal
          title={`Áp dụng mẫu ${applying.name}`}
          onClose={() => setApplying(null)}
        >
          <PatternApplyForm
            pattern={applying}
            notify={notify}
            onClose={() => setApplying(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function AssignmentsTab({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [editing, setEditing] = useState<AssignmentDto | null>(null);

  const filters: Record<string, string> = {};
  if (query.trim()) filters.q = query.trim();
  if (from) filters.from = from;
  if (to) filters.to = to;
  const assignments = useAssignments(filters);
  const shifts = useShifts({});
  const names = new Map(shifts.items.map((shift) => [shift.id, shift]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Tìm nhân sự"
            placeholder="Tìm theo tên hoặc ghi chú…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:w-56"
          />
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
            {assignments.items.length}/{assignments.total} lượt
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setBulk(true)}>
            Gán hàng loạt
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            Gán ca
          </Button>
        </div>
      </div>
      {assignments.error && (
        <ErrorLine message={assignments.error} retry={assignments.reload} />
      )}
      {assignments.loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải lịch gán…
        </p>
      ) : !assignments.items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa có lịch gán ca</h2>
          <p className="text-sm text-muted-foreground">
            Mỗi nhân sự chỉ có một ca cho một ngày; gán trùng sẽ bị từ chối.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Gán ca
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {assignments.items.map((assignment) => {
            const shift = names.get(assignment.shiftId);
            return (
              <li
                key={assignment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {assignment.employeeName}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {assignment.employeeId}
                    </span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {assignment.workDate} ·{" "}
                    {shift
                      ? `${shift.name} ${shift.startTime}–${shift.endTime}`
                      : "Ca đã xóa"}{" "}
                    · {sourceLabels[assignment.source]}
                    {assignment.note ? ` · ${assignment.note}` : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(assignment)}
                >
                  Sửa
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {creating && (
        <Modal title="Gán ca cho nhân sự" onClose={() => setCreating(false)}>
          <AssignmentForm
            shifts={shifts.items}
            notify={notify}
            onClose={() => setCreating(false)}
          />
        </Modal>
      )}
      {bulk && (
        <Modal title="Gán ca hàng loạt" onClose={() => setBulk(false)}>
          <BulkAssignForm
            shifts={shifts.items}
            notify={notify}
            onClose={() => setBulk(false)}
          />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa lịch ${editing.employeeName} ngày ${editing.workDate}`}
          onClose={() => setEditing(null)}
        >
          <AssignmentForm
            record={editing}
            shifts={shifts.items}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

export function ModulePage() {
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab =
    requested === "patterns" || requested === "assignments"
      ? requested
      : "shifts";
  const [message, setMessage] = useState("");

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 5000);
  }

  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="flex flex-col gap-1">
          <h1>{definition.title}</h1>
          <p className="text-sm text-muted-foreground">
            Khung giờ ca, mẫu tuần và lịch gán theo ngày. Mỗi nhân sự chỉ có một
            ca mỗi ngày; ca qua đêm tính theo múi giờ Asia/Ho_Chi_Minh.
          </p>
        </div>
        <nav aria-label="Nhóm ca làm việc" className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <a
              key={item.key}
              href={`?tab=${item.key}&section=${encodeURIComponent(item.label)}`}
              aria-current={tab === item.key ? "page" : undefined}
              className={`rounded-control border px-3 py-1.5 text-sm ${
                tab === item.key
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {tab === "shifts" && <ShiftsTab notify={notify} />}
        {tab === "patterns" && <PatternsTab notify={notify} />}
        {tab === "assignments" && <AssignmentsTab notify={notify} />}
      </section>

      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Đóng thông báo" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
