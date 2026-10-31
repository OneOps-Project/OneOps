"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  LineDto,
  PeriodDto,
} from "@/features/hr-management/attendance/attendance-reports/types";
import {
  definition,
  statusLabels,
} from "@/features/hr-management/attendance/attendance-reports/constants";
import { client } from "@/features/hr-management/attendance/attendance-reports/api/client";
import {
  attendanceReportsChanged,
  useLines,
  usePeriods,
  useSummary,
} from "@/features/hr-management/attendance/attendance-reports/hooks/use-attendance-reports";
import {
  LineForm,
  PeriodForm,
} from "@/features/hr-management/attendance/attendance-reports/components/report-forms";
import {
  Badge,
  Button,
  ErrorLine,
  Input,
  Modal,
  Select,
} from "@/features/hr-management/attendance/attendance-reports/components/primitives/ui";

type Tab = "periods" | "lines";

const tabs: { key: Tab; label: string }[] = [
  { key: "periods", label: "Kỳ công" },
  { key: "lines", label: "Bảng công" },
];

function PeriodsTab({
  notify,
  onOpenLines,
}: {
  notify: (message: string) => void;
  onOpenLines: (periodId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PeriodDto | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [actionError, setActionError] = useState("");

  const filters: Record<string, string> = {};
  if (query.trim()) filters.q = query.trim();
  const { items, total, loading, error, reload } = usePeriods(filters);

  async function toggle(record: PeriodDto) {
    if (pendingId) return;
    setPendingId(record.id);
    setActionError("");
    try {
      const status = record.status === "DRAFT" ? "CLOSED" : "DRAFT";
      await client.updatePeriod(record, { status });
      attendanceReportsChanged();
      notify(
        status === "CLOSED"
          ? "Đã chốt kỳ công."
          : "Đã mở lại kỳ công để chỉnh sửa.",
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể đổi trạng thái",
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
            aria-label="Tìm kỳ công"
            placeholder="Tìm theo tên hoặc kỳ…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:w-56"
          />
          <span className="text-sm text-muted-foreground">
            {items.length}/{total} kỳ
          </span>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          Tạo kỳ công
        </Button>
      </div>
      {(error || actionError) && (
        <ErrorLine message={error || actionError} retry={reload} />
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải kỳ công…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa có kỳ công</h2>
          <p className="text-sm text-muted-foreground">
            Tạo kỳ công theo tháng để tổng hợp ngày công, nghỉ phép và tăng ca.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Tạo kỳ công
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((period) => (
            <li
              key={period.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <span className="block text-sm font-semibold">
                  {period.name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {period.periodKey}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {period.fromDate} → {period.toDate} · {period.lineCount} dòng
                  công{period.note ? ` · ${period.note}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={period.status === "CLOSED" ? "neutral" : "info"}>
                  {statusLabels[period.status]}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenLines(period.id)}
                >
                  Bảng công
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(period)}
                >
                  Sửa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === period.id}
                  onClick={() => void toggle(period)}
                >
                  {period.status === "DRAFT" ? "Chốt" : "Mở lại"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <Modal title="Tạo kỳ công" onClose={() => setCreating(false)}>
          <PeriodForm notify={notify} onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa kỳ công ${editing.periodKey}`}
          onClose={() => setEditing(null)}
        >
          <PeriodForm
            record={editing}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function LinesPanel({
  periodId,
  closed,
  notify,
}: {
  periodId: string;
  closed: boolean;
  notify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LineDto | null>(null);

  const filters: Record<string, string> = { periodId };
  if (query.trim()) filters.q = query.trim();
  const { items, total, loading, error, reload } = useLines(filters);
  const { summary } = useSummary(periodId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Tìm nhân sự trong bảng công"
            placeholder="Tìm theo tên hoặc mã…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:w-56"
          />
          <span className="text-sm text-muted-foreground">
            {items.length}/{total} dòng
          </span>
        </div>
        <Button size="sm" disabled={closed} onClick={() => setCreating(true)}>
          Thêm dòng công
        </Button>
      </div>

      {summary && (
        <div className="flex flex-wrap gap-2">
          <Badge tone="neutral">Nhân sự: {summary.headcount}</Badge>
          <Badge tone="success">Ngày công: {summary.workedDays}</Badge>
          <Badge tone="info">Nghỉ có lương: {summary.paidLeaveDays}</Badge>
          <Badge tone="warning">
            Nghỉ không lương: {summary.unpaidLeaveDays}
          </Badge>
          <Badge tone="neutral">Tăng ca: {summary.overtimeHours}h</Badge>
        </div>
      )}

      {closed && (
        <p className="text-xs text-muted-foreground">
          Kỳ công đã chốt nên không thể thêm hoặc sửa dòng công. Mở lại kỳ ở
          trạng thái “Đang tổng hợp” nếu cần điều chỉnh.
        </p>
      )}

      {error && <ErrorLine message={error} retry={reload} />}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải bảng công…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa có dòng công</h2>
          <p className="text-sm text-muted-foreground">
            Thêm từng nhân sự với ngày công, nghỉ phép và tăng ca của kỳ này.
          </p>
          <Button size="sm" disabled={closed} onClick={() => setCreating(true)}>
            Thêm dòng công
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <span className="block text-sm font-semibold">
                  {line.employeeName}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {line.employeeId}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  Công {line.workedDays} · nghỉ có lương {line.paidLeaveDays} ·
                  nghỉ không lương {line.unpaidLeaveDays} · tăng ca{" "}
                  {line.overtimeHours}h{line.note ? ` · ${line.note}` : ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={closed}
                onClick={() => setEditing(line)}
              >
                Sửa
              </Button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <Modal title="Thêm dòng công" onClose={() => setCreating(false)}>
          <LineForm
            periodId={periodId}
            notify={notify}
            onClose={() => setCreating(false)}
          />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa dòng công ${editing.employeeName}`}
          onClose={() => setEditing(null)}
        >
          <LineForm
            periodId={periodId}
            record={editing}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function LinesTab({
  notify,
  initialPeriodId,
}: {
  notify: (message: string) => void;
  initialPeriodId: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initialPeriodId);
  const { items, loading, error, reload } = usePeriods(
    query.trim() ? { q: query.trim() } : {},
  );
  const active =
    items.find((period) => period.id === selected) ?? items[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          aria-label="Chọn kỳ công"
          value={active?.id ?? ""}
          onChange={(event) => setSelected(event.target.value)}
          className="sm:w-72"
        >
          {items.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name} ({period.periodKey})
            </option>
          ))}
        </Select>
        <Input
          aria-label="Tìm kỳ công"
          placeholder="Tìm kỳ công…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="sm:w-56"
        />
      </div>
      {error && <ErrorLine message={error} retry={reload} />}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải danh sách kỳ công…
        </p>
      ) : !active ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa có kỳ công để xem</h2>
          <p className="text-sm text-muted-foreground">
            Tạo kỳ công ở thẻ “Kỳ công” trước khi nhập bảng công.
          </p>
        </div>
      ) : (
        <LinesPanel
          key={active.id}
          periodId={active.id}
          closed={active.status === "CLOSED"}
          notify={notify}
        />
      )}
    </div>
  );
}

export function ModulePage() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    params.get("tab") === "lines" ? "lines" : "periods",
  );
  const [selectedPeriod, setSelectedPeriod] = useState("");
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
            Tổng hợp ngày công, nghỉ phép và tăng ca theo tháng. Kỳ đã chốt khóa
            bảng công cho tới khi mở lại.
          </p>
        </div>
        <nav
          aria-label="Nhóm báo cáo chấm công"
          className="flex flex-wrap gap-2"
        >
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={tab === item.key ? "page" : undefined}
              onClick={() => setTab(item.key)}
              className={`rounded-control border px-3 py-1.5 text-sm ${
                tab === item.key
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {tab === "periods" && (
          <PeriodsTab
            notify={notify}
            onOpenLines={(periodId) => {
              setSelectedPeriod(periodId);
              setTab("lines");
            }}
          />
        )}
        {tab === "lines" && (
          <LinesTab notify={notify} initialPeriodId={selectedPeriod} />
        )}
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
