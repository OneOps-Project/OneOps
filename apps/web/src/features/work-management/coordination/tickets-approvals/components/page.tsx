"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  InboxEntry,
  RecordDto,
} from "@/features/work-management/coordination/tickets-approvals/types";
import { definition } from "@/features/work-management/coordination/tickets-approvals/constants";
import { client } from "@/features/work-management/coordination/tickets-approvals/api/client";
import {
  useModuleRecords,
  recordsChanged,
} from "@/features/work-management/coordination/tickets-approvals/hooks/use-records";
import {
  Modal,
  useWorkspace,
} from "@/features/work-management/coordination/tickets-approvals/components/primitives/workspace";
import { Button } from "@/features/work-management/coordination/tickets-approvals/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/work-management/coordination/tickets-approvals/components/primitives/forms";
import { Badge } from "@/features/work-management/coordination/tickets-approvals/components/primitives/foundations";
import { RecordForm } from "@/features/work-management/coordination/tickets-approvals/components/record-form";
import { ApprovalPanel } from "@/features/work-management/coordination/tickets-approvals/components/approval-panel";
import styles from "@/features/work-management/coordination/tickets-approvals/components/styles.module.css";

export function ModulePage() {
  const params = useSearchParams();
  const { openCreate, notify } = useWorkspace();
  const { records, loading, error, reload } = useModuleRecords();
  const [query, setQuery] = useState(params.get("q") || "");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<RecordDto | null>(null),
    [editing, setEditing] = useState<RecordDto | null>(null),
    [deleting, setDeleting] = useState<RecordDto | null>(null),
    [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [view, setView] = useState("list");
  const [inbox, setInbox] = useState<{ items: InboxEntry[]; key: string }>({
    items: [],
    key: "",
  });
  const [inboxRevision, setInboxRevision] = useState(0);
  const effectiveStatus =
    status === "all" ? "" : status || params.get("status") || "";
  // The inbox is a server filter: only gates the current actor may decide.
  const inboxKey = view === "inbox" ? `inbox:${inboxRevision}` : "";
  useEffect(() => {
    if (!inboxKey) return;
    const controller = new AbortController();
    client
      .inbox(controller.signal)
      .then((page) => setInbox({ items: page.items, key: inboxKey }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setActionError(
          cause instanceof Error
            ? cause.message
            : "Không tải được hộp chờ duyệt.",
        );
      });
    return () => controller.abort();
  }, [inboxKey]);
  const inboxLoading = Boolean(inboxKey) && inbox.key !== inboxKey;
  const inboxItems = inbox.key === inboxKey ? inbox.items : [];
  const filtered = records.filter(
    (record) =>
      (!effectiveStatus || record.status === effectiveStatus) &&
      `${record.code} ${record.name} ${record.assignee} ${record.note} ${Object.values(record.fields).join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(query.trim().toLocaleLowerCase("vi")),
  );
  function exportCsv() {
    const cell = (value: string) =>
      '"' +
      (/^[=+@-]/.test(value) ? "'" : "") +
      value.replaceAll('"', '""') +
      '"';
    const csv = [
      [
        "Mã",
        "Tiêu đề",
        "Trạng thái",
        definition.dateLabel,
        definition.personLabel,
      ],
      ...filtered.map((r) => [r.code, r.name, r.status, r.date, r.assignee]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "requests.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.root}>
      <div className="module-view">
        <section className="records-panel">
          <div className={styles.header}>
            <div>
              <h1>{definition.title}</h1>
              <p>Theo dõi đề xuất và cập nhật kết quả phê duyệt.</p>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={exportCsv}>
                Xuất CSV
              </Button>
              <Button onClick={openCreate}>Tạo mới</Button>
            </div>
          </div>

          <div className={styles.toolbar}>
            <Input
              aria-label="Tìm kiếm"
              placeholder={"Tìm " + definition.singular + "…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              aria-label="Lọc trạng thái"
              value={effectiveStatus}
              onChange={(e) => setStatus(e.target.value || "all")}
            >
              <option value="">Tất cả trạng thái</option>
              {definition.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Button
              variant={view === "list" ? "primary" : "secondary"}
              onClick={() => setView("list")}
            >
              Danh sách
            </Button>
            <Button
              variant={view === "cards" ? "primary" : "secondary"}
              onClick={() => setView("cards")}
            >
              Thẻ
            </Button>
            <Button
              variant={view === "inbox" ? "primary" : "secondary"}
              onClick={() => setView("inbox")}
            >
              Chờ tôi duyệt
            </Button>
            <span className="text-sm text-muted-foreground">
              {filtered.length} mục
            </span>
          </div>
          {(error || actionError) && (
            <div role="alert" className="error">
              {error || actionError}
              <Button variant="ghost" onClick={reload}>
                Thử lại
              </Button>
            </div>
          )}
          {view === "inbox" ? (
            <>
              <div className={styles.actions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInboxRevision((value) => value + 1)}
                >
                  Làm mới
                </Button>
                <span className="text-sm text-muted-foreground">
                  {inboxItems.length} bước chờ bạn
                </span>
              </div>
              {inboxLoading ? (
                <p role="status">Đang tải hộp chờ duyệt…</p>
              ) : !inboxItems.length ? (
                <div className={styles.empty}>
                  <h2>Không có đề xuất nào chờ bạn</h2>
                  <p>Mọi bước bạn phụ trách đã được xử lý.</p>
                </div>
              ) : (
                <ul className={styles.chain}>
                  {inboxItems.map((entry) => (
                    <li key={entry.step.id} className={styles.step}>
                      <div className={styles.stepHead}>
                        <div className={styles.stepTitle}>
                          <strong>
                            {entry.request.code} · {entry.request.name}
                          </strong>
                          <span className="text-sm text-muted-foreground">
                            {entry.step.name} · SLA {entry.step.slaHours} giờ
                          </span>
                        </div>
                        <Badge
                          variant={
                            entry.step.sla === "OVERDUE"
                              ? "danger"
                              : entry.step.sla === "DUE_SOON"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {entry.step.remainingMinutes <= 0
                            ? "Quá hạn"
                            : `Còn ${Math.ceil(entry.step.remainingMinutes / 60)} giờ`}
                        </Badge>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDetail(entry.request)}
                        >
                          Mở
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : loading ? (
            <p role="status">Đang tải dữ liệu…</p>
          ) : !filtered.length ? (
            <div className={styles.empty}>
              <h2>Chưa có {definition.singular} phù hợp</h2>
              <p>Tạo nội dung đầu tiên hoặc thay đổi điều kiện tìm kiếm.</p>
              <Button onClick={openCreate}>Tạo mới</Button>
            </div>
          ) : (
            <>
              {view === "list" ? (
                <div className={styles.scroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Tiêu đề</th>
                        <th>Trạng thái</th>
                        <th>{definition.dateLabel}</th>
                        <th>{definition.personLabel}</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((record) => (
                        <tr key={record.id}>
                          <td>{record.code}</td>
                          <td>
                            <button
                              className="font-medium"
                              onClick={() => setDetail(record)}
                            >
                              {record.name}
                            </button>
                          </td>
                          <td>
                            <Badge>{record.status}</Badge>
                          </td>
                          <td>{record.date}</td>
                          <td>{record.assignee || "Chưa phân công"}</td>
                          <td>
                            <div className={styles.actions}>
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
                                onClick={() => setDeleting(record)}
                              >
                                Xóa
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.grid}>
                  {filtered.map((record) => (
                    <article className={styles.card} key={record.id}>
                      <div className={styles.meta}>
                        <span>{record.code}</span>
                        <Badge>{record.status}</Badge>
                      </div>
                      <h3>
                        <button
                          type="button"
                          className={styles.titleLink}
                          onClick={() => setDetail(record)}
                        >
                          {record.name}
                        </button>
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {record.note}
                      </p>
                      <div className={styles.meta}>
                        <span>{record.assignee || "Chưa phân công"}</span>
                        <span>{record.date}</span>
                      </div>
                      <div className={styles.actions}>
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
                          onClick={() => setDeleting(record)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className={styles.details}>
            <Badge>{detail.status}</Badge>
            <p>
              <strong>{detail.code}</strong> · {detail.date} ·{" "}
              {detail.assignee || "Chưa phân công"}
            </p>
            <p>{detail.note || "Chưa có mô tả."}</p>
            {Object.entries(detail.fields)
              .filter(([, value]) => !Array.isArray(value))
              .map(([key, value]) => (
                <p key={key}>
                  <strong>
                    {definition.fields.find((field) => field.key === key)
                      ?.label || key}
                    :{" "}
                  </strong>
                  {String(value)}
                </p>
              ))}
            <ApprovalPanel
              request={detail}
              onChanged={(next) => {
                setDetail(next);
                // Deciding a step changes the actor's inbox, so refetch it.
                setInboxRevision((value) => value + 1);
              }}
            />
          </div>
          <footer>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(detail);
                setDetail(null);
              }}
            >
              Chỉnh sửa
            </Button>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
          </footer>
        </Modal>
      )}
      {editing && (
        <Modal
          title={"Chỉnh sửa " + definition.singular}
          onClose={() => setEditing(null)}
        >
          <RecordForm record={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
      {deleting && (
        <Modal title="Xác nhận xóa" onClose={() => setDeleting(null)}>
          <div className="form-body">
            <p>Bạn muốn xóa “{deleting.name}”?</p>
            {actionError && (
              <p className="error" role="alert">
                {actionError}
              </p>
            )}
          </div>
          <footer>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                if (pending) return;
                setPending(true);
                setActionError("");
                try {
                  await client.remove(deleting);
                  recordsChanged();
                  setInboxRevision((value) => value + 1);
                  setDeleting(null);
                  notify("Đã xóa thành công.");
                } catch (e) {
                  setActionError(
                    e instanceof Error ? e.message : "Không thể xóa",
                  );
                } finally {
                  setPending(false);
                }
              }}
            >
              Xóa
            </Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
