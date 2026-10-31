"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  HolidayDto,
  NetworkDto,
  QuotaDto,
  Status,
} from "@/features/tenant-system/organization/work-policies/types";
import {
  definition,
  statusLabels,
} from "@/features/tenant-system/organization/work-policies/constants";
import { client } from "@/features/tenant-system/organization/work-policies/api/client";
import {
  useHolidays,
  useNetworks,
  usePolicy,
  useQuotas,
  workPoliciesChanged,
} from "@/features/tenant-system/organization/work-policies/hooks/use-work-policies";
import {
  Modal,
  useWorkspace,
} from "@/features/tenant-system/organization/work-policies/components/primitives/workspace";
import { Button } from "@/features/tenant-system/organization/work-policies/components/primitives/button";
import { Badge } from "@/features/tenant-system/organization/work-policies/components/primitives/foundations";
import {
  HolidayForm,
  NetworkForm,
  PolicyForm,
  QuotaForm,
} from "@/features/tenant-system/organization/work-policies/components/policy-forms";

type Tab = "general" | "holidays" | "networks" | "quotas";

const tabs: { key: Tab; label: string }[] = [
  { key: "general", label: "Chung" },
  { key: "holidays", label: "Ngày lễ" },
  { key: "networks", label: "Mạng văn phòng" },
  { key: "quotas", label: "Hạn mức phép" },
];

function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant={status === "ACTIVE" ? "success" : "neutral"} dot>
      {statusLabels[status]}
    </Badge>
  );
}

function ErrorLine({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="error">
      {message}
      {retry && (
        <Button variant="ghost" size="sm" onClick={retry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

function GeneralTab() {
  const { policy, loading, error, reload } = usePolicy();
  if (loading)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Đang tải chính sách…
      </p>
    );
  if (error || !policy)
    return (
      <ErrorLine
        message={error || "Không tải được chính sách"}
        retry={reload}
      />
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Giờ làm chuẩn, ngày làm việc và ân hạn đi muộn dùng chung cho chấm công,
        ca làm và tính công suất. Ngày lễ và hạn mức phép nằm ở các thẻ bên
        cạnh.
      </p>
      <PolicyForm record={policy} />
    </div>
  );
}

function HolidaysTab() {
  const { notify } = useWorkspace();
  const { items, loading, error, reload } = useHolidays();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<HolidayDto | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [actionError, setActionError] = useState("");

  async function toggle(record: HolidayDto) {
    if (pendingId) return;
    setPendingId(record.id);
    setActionError("");
    try {
      const status: Status = record.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await client.updateHoliday(record, { status });
      workPoliciesChanged();
      notify(
        status === "ACTIVE" ? "Đã kích hoạt lại ngày lễ." : "Đã ngừng ngày lễ.",
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Ngày lễ không sinh ca mặc định và được trừ khỏi công suất khả dụng.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          Thêm ngày lễ
        </Button>
      </div>
      {(error || actionError) && (
        <ErrorLine message={error || actionError} retry={reload} />
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải ngày lễ…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa có ngày lễ</h2>
          <p className="text-sm text-muted-foreground">
            Thêm ngày lễ để loại khỏi ngày công và công suất.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Thêm ngày lễ
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-border bg-surface p-3"
            >
              <div>
                <span className="block text-sm font-semibold">{item.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.date} · {item.paid ? "Có lương" : "Không lương"}
                  {item.note ? ` · ${item.note}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(item)}
                >
                  Sửa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === item.id}
                  onClick={() => void toggle(item)}
                >
                  {item.status === "ACTIVE" ? "Ngừng" : "Kích hoạt"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <Modal title="Thêm ngày lễ" onClose={() => setCreating(false)}>
          <HolidayForm onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title={`Sửa ${editing.name}`} onClose={() => setEditing(null)}>
          <HolidayForm record={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

function NetworksTab() {
  const { notify } = useWorkspace();
  const { items, loading, error, reload } = useNetworks();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<NetworkDto | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [actionError, setActionError] = useState("");

  async function toggle(record: NetworkDto) {
    if (pendingId) return;
    setPendingId(record.id);
    setActionError("");
    try {
      const status: Status = record.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await client.updateNetwork(record, { status });
      workPoliciesChanged();
      notify(
        status === "ACTIVE" ? "Đã kích hoạt mạng." : "Đã ngừng mạng văn phòng.",
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Chấm công từ xa chỉ được chấp nhận khi địa chỉ IP thuộc một dải đang
          áp dụng.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          Thêm mạng
        </Button>
      </div>
      {(error || actionError) && (
        <ErrorLine message={error || actionError} retry={reload} />
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải mạng văn phòng…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa khai báo mạng</h2>
          <p className="text-sm text-muted-foreground">
            Thêm dải IPv4 của văn phòng để đối chiếu khi chấm công.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Thêm mạng
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-border bg-surface p-3"
            >
              <div>
                <span className="block text-sm font-semibold">
                  {item.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.cidr}
                  {item.note ? ` · ${item.note}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(item)}
                >
                  Sửa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === item.id}
                  onClick={() => void toggle(item)}
                >
                  {item.status === "ACTIVE" ? "Ngừng" : "Kích hoạt"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <Modal title="Thêm mạng văn phòng" onClose={() => setCreating(false)}>
          <NetworkForm onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title={`Sửa ${editing.label}`} onClose={() => setEditing(null)}>
          <NetworkForm record={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

function QuotasTab() {
  const { items, loading, error, reload } = useQuotas();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<QuotaDto | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Hạn mức phép theo năm dùng để đối chiếu số ngày còn lại; không dùng để
          tính lương.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          Thêm hạn mức
        </Button>
      </div>
      {error && <ErrorLine message={error} retry={reload} />}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải hạn mức phép…
        </p>
      ) : !items.length ? (
        <div className="rounded-panel border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Chưa có hạn mức</h2>
          <p className="text-sm text-muted-foreground">
            Khai báo số ngày phép mỗi năm để tính số ngày còn lại.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            Thêm hạn mức
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-border bg-surface p-3"
            >
              <div>
                <span className="block text-sm font-semibold">
                  Năm {item.year}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.daysPerYear} ngày/năm · chuyển tối đa{" "}
                  {item.maxCarryOverDays} ngày
                  {item.note ? ` · ${item.note}` : ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(item)}
              >
                Sửa
              </Button>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <Modal title="Thêm hạn mức phép" onClose={() => setCreating(false)}>
          <QuotaForm onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Sửa hạn mức năm ${editing.year}`}
          onClose={() => setEditing(null)}
        >
          <QuotaForm record={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

export function ModulePage() {
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab =
    requested === "holidays" ||
    requested === "networks" ||
    requested === "quotas"
      ? requested
      : "general";

  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="flex flex-col gap-1">
          <h1>{definition.title}</h1>
          <p className="text-sm text-muted-foreground">
            Nguồn duy nhất cho giờ làm chuẩn, ngày lễ, mạng văn phòng và hạn mức
            phép của toàn công ty.
          </p>
        </div>
        <nav aria-label="Nhóm chính sách" className="flex flex-wrap gap-2">
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
        {tab === "general" && <GeneralTab />}
        {tab === "holidays" && <HolidaysTab />}
        {tab === "networks" && <NetworksTab />}
        {tab === "quotas" && <QuotasTab />}
      </section>
    </div>
  );
}
