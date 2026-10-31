"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  AllocationDto,
  AllocationStatus,
  PeriodDto,
} from "@/features/hr-management/employees/resource-capacity/types";
import {
  allocationStatusLabels,
  allocationStatusTones,
  definition,
} from "@/features/hr-management/employees/resource-capacity/constants";
import { client } from "@/features/hr-management/employees/resource-capacity/api/client";
import {
  capacityChanged,
  useAllocations,
  usePeriods,
  useWorkload,
} from "@/features/hr-management/employees/resource-capacity/hooks/use-capacity";
import { PeriodForm } from "@/features/hr-management/employees/resource-capacity/components/period-form";
import { AllocationForm } from "@/features/hr-management/employees/resource-capacity/components/allocation-form";
import {
  Badge,
  Button,
  ErrorLine,
  Input,
  Modal,
  Select,
} from "@/features/hr-management/employees/resource-capacity/components/primitives/ui";

type Tab = "periods" | "allocations";

const tabs: { key: Tab; label: string }[] = [
  { key: "periods", label: "Kỳ công suất" },
  { key: "allocations", label: "Phân bổ dự án" },
];

function PeriodsTab({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PeriodDto | null>(null);

  const filters: Record<string, string> = {};
  if (query.trim()) filters.q = query.trim();
  if (from) filters.from = from;
  if (to) filters.to = to;
  const { items, total, loading, error, reload } = usePeriods(filters);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Tìm kỳ công suất"
            placeholder="Tìm theo nhân sự…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="sm:w-56"
          />
          <Input
            type="date"
            aria-label="Kỳ từ ngày"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            type="date"
            aria-label="Kỳ đến ngày"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <span className="text-sm text-muted-foreground">
            {items.length}/{total} kỳ
          </span>
        </div>
        <Button onClick={() => setCreating(true)}>Tạo kỳ công suất</Button>
      </div>

      {error && <ErrorLine message={error} retry={reload} />}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải kỳ công suất…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">
            {total ? "Không có kỳ phù hợp" : "Chưa có kỳ công suất"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {total
              ? "Đổi bộ lọc hoặc khoảng ngày để xem lại."
              : "Tạo kỳ công suất để tính giờ khả dụng sau khi trừ ngày lễ và phép đã duyệt."}
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Tạo kỳ công suất
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
                  {period.employeeName}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {period.employeeId}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {period.fromDate} → {period.toDate} · {period.workingDays}{" "}
                  ngày làm việc · {period.standardHoursPerDay} giờ/ngày
                </span>
                <span className="block text-xs text-muted-foreground">
                  Ngày lễ {period.holidayDays} · phép đã duyệt{" "}
                  {period.leaveDays}
                  {period.note ? ` · ${period.note}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className="text-sm text-info underline-offset-4 hover:underline"
                  href={`?tab=allocations&period=${period.id}&section=${encodeURIComponent("Phân bổ dự án")}`}
                >
                  Phân bổ
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(period)}
                >
                  Sửa
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <Modal title="Tạo kỳ công suất" onClose={() => setCreating(false)}>
          <PeriodForm notify={notify} onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa kỳ ${editing.employeeName}`}
          onClose={() => setEditing(null)}
        >
          <PeriodForm
            record={editing}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}

function AllocationsTab({
  periods,
  notify,
}: {
  periods: PeriodDto[];
  notify: (message: string) => void;
}) {
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState(params.get("period") ?? "");
  const [status, setStatus] = useState<AllocationStatus | "">("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AllocationDto | null>(null);
  const [cancelling, setCancelling] = useState<AllocationDto | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [actionError, setActionError] = useState("");

  const filters: Record<string, string> = {};
  if (selectedId) filters.periodId = selectedId;
  if (status) filters.status = status;
  const { items, total, loading, error, reload } = useAllocations(filters);
  const workload = useWorkload(selectedId);
  const selectedPeriod = periods.find((period) => period.id === selectedId);

  async function confirmCancel() {
    if (!cancelling || pendingId) return;
    setPendingId(cancelling.id);
    setActionError("");
    try {
      await client.cancelAllocation(cancelling);
      capacityChanged();
      notify("Đã hủy phân bổ dự án.");
      setCancelling(null);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể hủy phân bổ",
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <Select
            aria-label="Chọn kỳ công suất"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="sm:w-72"
          >
            <option value="">Tất cả kỳ</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.employeeName} · {period.fromDate} → {period.toDate}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Lọc trạng thái phân bổ"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AllocationStatus | "")
            }
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(allocationStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
          <span className="text-sm text-muted-foreground">
            {items.length}/{total} phân bổ
          </span>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!periods.length}>
          Thêm phân bổ
        </Button>
      </div>

      {workload.data && (
        <div className="rounded-panel border border-border bg-surface p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Công suất kỳ {workload.data.period.fromDate} →{" "}
              {workload.data.period.toDate}
            </h2>
            <Badge
              tone={workload.data.summary.overCapacity ? "warning" : "success"}
            >
              {workload.data.summary.overCapacity
                ? "Quá tải — chỉ cảnh báo"
                : "Trong giới hạn"}
            </Badge>
          </div>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Giờ khả dụng</dt>
              <dd className="font-medium">
                {workload.data.summary.availableHours} giờ
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Đã phân bổ</dt>
              <dd className="font-medium">
                {workload.data.summary.allocatedHours} giờ (
                {workload.data.summary.allocatedPercent}%)
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Còn lại</dt>
              <dd className="font-medium">
                {workload.data.summary.remainingHours} giờ
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Mức sử dụng</dt>
              <dd className="font-medium">
                {workload.data.summary.utilization}%
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Công suất tính phía máy chủ: {workload.data.summary.workingDays}{" "}
            ngày làm việc − {workload.data.summary.holidayDays} ngày lễ −{" "}
            {workload.data.summary.leaveDays} ngày phép đã duyệt ×{" "}
            {workload.data.summary.standardHoursPerDay} giờ/ngày. Quá tải chỉ
            cảnh báo, quản lý vẫn quyết định.
          </p>
        </div>
      )}
      {workload.error && (
        <ErrorLine message={workload.error} retry={workload.reload} />
      )}

      {(error || actionError) && (
        <ErrorLine message={error || actionError} retry={reload} />
      )}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải phân bổ dự án…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">
            {total ? "Không có phân bổ phù hợp" : "Chưa có phân bổ dự án"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedPeriod
              ? "Thêm phân bổ để theo dõi mức sử dụng công suất của kỳ này."
              : "Chọn một kỳ công suất để xem và thêm phân bổ dự án."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((allocation) => (
            <li
              key={allocation.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <span className="block text-sm font-semibold">
                  {allocation.projectRef}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {allocation.employeeName} · {allocation.percentage}% công suất
                  {allocation.note ? ` · ${allocation.note}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={allocationStatusTones[allocation.status]}>
                  {allocationStatusLabels[allocation.status]}
                </Badge>
                {allocation.status !== "CANCELLED" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(allocation)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancelling(allocation)}
                    >
                      Hủy
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <Modal title="Thêm phân bổ dự án" onClose={() => setCreating(false)}>
          <AllocationForm
            periods={periods}
            initialPeriodId={selectedId}
            notify={notify}
            onClose={() => setCreating(false)}
          />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa phân bổ ${editing.projectRef}`}
          onClose={() => setEditing(null)}
        >
          <AllocationForm
            record={editing}
            periods={periods}
            notify={notify}
            onClose={() => setEditing(null)}
          />
        </Modal>
      )}
      {cancelling && (
        <Modal title="Hủy phân bổ dự án" onClose={() => setCancelling(null)}>
          <p className="text-sm">
            Phân bổ {cancelling.projectRef} sẽ chuyển sang trạng thái đã hủy và
            không tính vào mức sử dụng công suất.
          </p>
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}
          <footer className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelling(null)}>
              Giữ phân bổ
            </Button>
            <Button
              variant="destructive"
              disabled={pendingId === cancelling.id}
              onClick={() => void confirmCancel()}
            >
              {pendingId === cancelling.id ? "Đang hủy…" : "Hủy phân bổ"}
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}

export function ModulePage() {
  const params = useSearchParams();
  const tab: Tab =
    params.get("tab") === "allocations" ? "allocations" : "periods";
  const [message, setMessage] = useState("");
  const periods = usePeriods({});

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
            Công suất theo kỳ được tính tự động từ giờ chuẩn, ngày lễ và phép đã
            duyệt; phân bổ dự án theo tỷ lệ và quá tải chỉ cảnh báo.
          </p>
        </div>
        <nav aria-label="Nhóm công suất" className="flex flex-wrap gap-2">
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
        {tab === "periods" ? (
          <PeriodsTab notify={notify} />
        ) : (
          <AllocationsTab periods={periods.items} notify={notify} />
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
