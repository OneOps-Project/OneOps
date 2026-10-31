"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  DecisionStatus,
  QueueItem,
} from "@/features/hr-management/leaves/leave-approvals/types";
import {
  definition,
  leaveTypeLabels,
  statusLabels,
  statusTones,
} from "@/features/hr-management/leaves/leave-approvals/constants";
import {
  useApprovalHistory,
  useApprovalQueue,
} from "@/features/hr-management/leaves/leave-approvals/hooks/use-approvals";
import { DecisionForm } from "@/features/hr-management/leaves/leave-approvals/components/decision-form";
import {
  Badge,
  Button,
  ErrorLine,
  Input,
  Modal,
  Select,
} from "@/features/hr-management/leaves/leave-approvals/components/primitives/ui";

type Tab = "queue" | "history";

const tabs: { key: Tab; label: string }[] = [
  { key: "queue", label: "Chờ duyệt" },
  { key: "history", label: "Lịch sử duyệt" },
];

function QueueTab({ notify }: { notify: (message: string) => void }) {
  const { items, loading, error, reload } = useApprovalQueue();
  const [deciding, setDeciding] = useState<{
    item: QueueItem;
    decision: DecisionStatus;
  } | null>(null);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Đơn đang chờ duyệt</h2>
        <span className="text-sm text-muted-foreground">
          {items.length} đơn
        </span>
      </div>

      {error && <ErrorLine message={error} retry={reload} />}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải hàng đợi duyệt…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold">Không có đơn chờ duyệt</h3>
          <p className="text-sm text-muted-foreground">
            Đơn nghỉ phép mới gửi từ trang Đơn của tôi sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <span className="block text-sm font-semibold">
                  {item.employeeName}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {item.employeeId}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {leaveTypeLabels[item.leaveType]} · {item.fromDate} →{" "}
                  {item.toDate} · {item.days} ngày làm việc
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.reason}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setDeciding({ item, decision: "APPROVED" })}
                >
                  Duyệt
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeciding({ item, decision: "REJECTED" })}
                >
                  Từ chối
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deciding && (
        <Modal
          title={
            deciding.decision === "APPROVED"
              ? "Duyệt đơn nghỉ phép"
              : "Từ chối đơn nghỉ phép"
          }
          onClose={() => setDeciding(null)}
        >
          <DecisionForm
            item={deciding.item}
            decision={deciding.decision}
            notify={notify}
            onClose={() => setDeciding(null)}
          />
        </Modal>
      )}
    </>
  );
}

function HistoryTab() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DecisionStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters: Record<string, string> = {};
  if (query.trim()) filters.q = query.trim();
  if (status) filters.status = status;
  if (from) filters.from = from;
  if (to) filters.to = to;
  const { items, total, loading, error, reload } = useApprovalHistory(filters);

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          aria-label="Tìm lịch sử duyệt"
          placeholder="Tìm theo nhân sự hoặc người duyệt…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="sm:w-56"
        />
        <Select
          aria-label="Lọc kết quả duyệt"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as DecisionStatus | "")
          }
        >
          <option value="">Tất cả kết quả</option>
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
          {items.length}/{total} quyết định
        </span>
      </div>

      {error && <ErrorLine message={error} retry={reload} />}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải lịch sử duyệt…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold">
            {total ? "Không có quyết định phù hợp" : "Chưa có lịch sử duyệt"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {total
              ? "Đổi bộ lọc hoặc khoảng ngày để xem lại."
              : "Kết quả duyệt hoặc từ chối đơn nghỉ phép được lưu tại đây."}
          </p>
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
                  {leaveTypeLabels[record.leaveType]} · {record.fromDate} →{" "}
                  {record.toDate} · {record.days} ngày làm việc
                </span>
                <span className="block text-xs text-muted-foreground">
                  {record.decidedBy} xử lý ngày {record.decidedAt.slice(0, 10)}
                  {record.decisionNote ? ` · ${record.decisionNote}` : ""}
                </span>
              </div>
              <Badge tone={statusTones[record.status]}>
                {statusLabels[record.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function ModulePage() {
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "history" ? "history" : "queue";
  const [message, setMessage] = useState("");

  function notify(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 5000);
  }

  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="page-header">
          <div>
            <span className="eyebrow">Nhân sự · Duyệt nghỉ</span>
            <h1>{definition.title}</h1>
            <p>
              Duyệt hoặc từ chối đơn nghỉ phép đang chờ và tra cứu lịch sử quyết
              định. Kết quả duyệt được lưu cùng người xử lý và thời điểm.
            </p>
          </div>
        </div>
        <nav aria-label="Nhóm duyệt nghỉ phép" className="flex flex-wrap gap-2">
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
        {tab === "queue" ? <QueueTab notify={notify} /> : <HistoryTab />}
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
