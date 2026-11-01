"use client";
import { useState } from "react";
import { KanbanBoard } from "@/features/work-management/work/kanban";
import { TaskComments } from "@/features/work-management/work/task-comments";
import { useSearchParams } from "next/navigation";
import type { RecordDto } from "@/features/work-management/work/tasks/types";
import { definition } from "@/features/work-management/work/tasks/constants";
import { client } from "@/features/work-management/work/tasks/api/client";
import {
  useModuleRecords,
  recordsChanged,
} from "@/features/work-management/work/tasks/hooks/use-records";
import {
  Modal,
  useWorkspace,
} from "@/features/work-management/work/tasks/components/primitives/workspace";
import { Button } from "@/features/work-management/work/tasks/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/work-management/work/tasks/components/primitives/forms";
import { Badge } from "@/features/work-management/work/tasks/components/primitives/foundations";
import { RecordForm } from "@/features/work-management/work/tasks/components/record-form";
import { ReassignForm } from "@/features/work-management/work/tasks/components/reassign-form";
import styles from "@/features/work-management/work/tasks/components/styles.module.css";

// Mock actor, sau này lấy từ auth
const MOCK_ACTOR = { id: "user-001", role: "assignee" as const };

export function ModulePage({
  initialView = "list",
}: {
  initialView?: "list" | "board";
}) {
  const params = useSearchParams();
  const { openCreate, notify } = useWorkspace();
  const { records, loading, error, reload } = useModuleRecords();
  const [query, setQuery] = useState(params.get("q") || "");
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<RecordDto | null>(null);
  const [editing, setEditing] = useState<RecordDto | null>(null);
  const [deleting, setDeleting] = useState<RecordDto | null>(null);
  const [reassigning, setReassigning] = useState<RecordDto | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [view, setView] = useState(initialView);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const effectiveStatus =
    status === "all" ? "" : status || params.get("status") || "";

  const filtered = records.filter(
    (record) =>
      (!effectiveStatus || record.status === effectiveStatus) &&
      `${record.code} ${record.name} ${record.assignee} ${record.reviewer} ${record.note} ${Object.values(record.fields).join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(query.trim().toLocaleLowerCase("vi")),
  );

  async function update(
    record: RecordDto,
    patch: Parameters<typeof client.update>[1],
  ) {
    if (pending) return false;
    setPending(true);
    setActionError("");
    if (patch.fields)
      setDetail((current) =>
        current?.id === record.id
          ? { ...current, fields: patch.fields! }
          : current,
      );
    try {
      const next = await client.update(record, patch);
      setDetail((current) => (current?.id === next.id ? next : current));
      recordsChanged();
      notify("Đã cập nhật thành công.");
      return true;
    } catch (e) {
      setDetail((current) => (current?.id === record.id ? record : current));
      setActionError(e instanceof Error ? e.message : "Không thể cập nhật");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(record: RecordDto, newStatus: string) {
    if (pending) return false;
    setPending(true);
    setActionError("");
    try {
      const next = await client.changeStatus(record.id, {
        status: newStatus as RecordDto["status"],
        actorId: MOCK_ACTOR.id,
        actorRole: MOCK_ACTOR.role,
        reason: "",
      });
      setDetail((current) => (current?.id === next.id ? next : current));
      recordsChanged();
      notify("Đã cập nhật trạng thái.");
      return true;
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Không thể đổi trạng thái",
      );
      return false;
    } finally {
      setPending(false);
    }
  }

  function getDeadlineStatus(record: RecordDto) {
    if (!record.deadline) return "normal" as const;
    const now = new Date();
    const deadline = new Date(record.deadline);
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const active = ["Cần làm", "Đang làm", "Làm lại"];
    if (!active.includes(record.status)) return "normal" as const;
    if (deadline < now) return "overdue" as const;
    if (deadline <= in24h) return "upcoming" as const;
    return "normal" as const;
  }

  function DeadlineBadge({ record }: { record: RecordDto }) {
    const ds = getDeadlineStatus(record);
    if (ds === "overdue")
      return (
        <Badge variant="danger" dot>
          Quá hạn
        </Badge>
      );
    if (ds === "upcoming")
      return (
        <Badge
          dot
          style={{ borderWidth: "1px", borderStyle: "solid" }}
          className="border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-300"
        >
          Sắp đến hạn
        </Badge>
      );
    return null;
  }

  function StatusBadge({ status: s }: { status: string }) {
    const v: Record<
      string,
      "success" | "danger" | "warning" | "info" | "neutral"
    > = {
      "Hoàn thành": "success",
      "Đã hủy": "neutral",
      "Làm lại": "danger",
      "Hoãn lại": "warning",
      "Chờ kiểm tra": "info",
      "Đang làm": "info",
      "Cần làm": "neutral",
    };
    return <Badge variant={v[s] ?? "neutral"}>{s}</Badge>;
  }

  function fmt(deadline?: string) {
    if (!deadline) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(deadline));
  }

  function exportCsv() {
    const cell = (v: string) =>
      '"' + (/^[=+@-]/.test(v) ? "'" : "") + v.replaceAll('"', '""') + '"';
    const csv = [
      [
        "Mã",
        "Tiêu đề",
        "Trạng thái",
        "Deadline",
        "Người phụ trách",
        "Người kiểm tra",
      ],
      ...filtered.map((r) => [
        r.code,
        r.name,
        r.status,
        fmt(r.deadline),
        r.assignee,
        r.reviewer,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }),
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: "tasks.csv",
    }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.root}>
      <div className="module-view">
        <section className="records-panel">
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1>{definition.title}</h1>
              <p>Phân công rõ ràng, theo dõi tiến độ và hoàn thành đúng hạn.</p>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={exportCsv}>
                Xuất CSV
              </Button>
              <Button onClick={openCreate}>Tạo mới</Button>
            </div>
          </div>

          {/* Toolbar */}
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
              variant={view === "board" ? "primary" : "secondary"}
              onClick={() => setView("board")}
            >
              Kanban
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

          {loading ? (
            <p role="status">Đang tải dữ liệu…</p>
          ) : !filtered.length ? (
            <div className={styles.empty}>
              <h2>Chưa có {definition.singular} phù hợp</h2>
              <p>Tạo nội dung đầu tiên hoặc thay đổi điều kiện tìm kiếm.</p>
              <Button onClick={openCreate}>Tạo mới</Button>
            </div>
          ) : view === "list" ? (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tiêu đề</th>
                    <th>Trạng thái</th>
                    <th>Deadline</th>
                    <th>{definition.personLabel}</th>
                    <th>{definition.reviewerLabel}</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <span className="font-mono text-sm">{record.code}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            className="font-medium"
                            onClick={() => setDetail(record)}
                          >
                            {record.name}
                          </button>
                          {record.reassignmentFlag.needed && (
                            <Badge variant="warning" className="text-xs">
                              Cần giao lại
                            </Badge>
                          )}
                          {(record.fields.comments?.length ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground">
                              💬 {record.fields.comments!.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={record.status} />
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-sm">
                            {fmt(record.deadline)}
                          </span>
                          <DeadlineBadge record={record} />
                        </div>
                      </td>
                      <td>{record.assignee || "—"}</td>
                      <td>{record.reviewer || "—"}</td>
                      <td>
                        <div className={styles.actions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetail(record)}
                          >
                            Chi tiết
                          </Button>
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
                            onClick={() => setReassigning(record)}
                          >
                            Giao lại
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
            <KanbanBoard
              records={records}
              filtered={filtered}
              statuses={definition.statuses}
              pending={pending}
              today={today}
              onOpen={(id) => {
                const r = records.find((item) => item.id === id);
                if (r) setDetail(r);
              }}
              onMove={(id, s) => {
                const r = records.find((item) => item.id === id);
                if (r) void changeStatus(r, s);
              }}
            />
          )}
        </section>
      </div>

      {/* Modal chi tiết */}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className={styles.details}>
            {actionError && (
              <p className="error" role="alert">
                {actionError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              {detail.fields.priority && (
                <Badge
                  variant={
                    detail.fields.priority === "Khẩn cấp" ? "danger" : "neutral"
                  }
                >
                  {detail.fields.priority}
                </Badge>
              )}
              <DeadlineBadge record={detail} />
              {detail.reassignmentFlag.needed && (
                <Badge variant="warning">Cần giao lại</Badge>
              )}
            </div>

            <dl className="space-y-1 text-sm">
              <div className="flex gap-3">
                <dt className="text-muted-foreground">Mã:</dt>
                <dd className="font-mono">{detail.code}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground">Deadline:</dt>
                <dd>{fmt(detail.deadline)}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground">
                  {definition.personLabel}:
                </dt>
                <dd>{detail.assignee || "—"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground">
                  {definition.reviewerLabel}:
                </dt>
                <dd>{detail.reviewer || "—"}</dd>
              </div>
            </dl>

            <p className="text-sm">{detail.note || "Chưa có mô tả."}</p>

            {detail.attachmentLinks.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">Link đính kèm:</p>
                <ul className="space-y-1">
                  {detail.attachmentLinks.map((link, i) => (
                    <li key={i}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary underline"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ROUND1-4: Cập nhật trạng thái nhanh - Role-based */}
            <div>
              <p className="mb-2 text-sm font-semibold">Cập nhật trạng thái:</p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const currentStatus = detail.status;
                  const role = MOCK_ACTOR.role;
                  let availableStatuses: string[] = [];

                  if (role === "manager") {
                    // Manager có thể chuyển sang bất kỳ trạng thái nào
                    availableStatuses = definition.statuses.filter(
                      (s) => s !== currentStatus,
                    );
                  } else if (role === "assignee") {
                    // Assignee: Cần làm → Đang làm → Chờ kiểm tra
                    //           Làm lại → Đang làm → Chờ kiểm tra
                    if (currentStatus === "Cần làm")
                      availableStatuses = ["Đang làm"];
                    else if (currentStatus === "Đang làm")
                      availableStatuses = ["Chờ kiểm tra"];
                    else if (currentStatus === "Làm lại")
                      availableStatuses = ["Đang làm"];
                  } else if (role === "reviewer") {
                    // Reviewer: Chờ kiểm tra → Hoàn thành hoặc Làm lại
                    if (currentStatus === "Chờ kiểm tra")
                      availableStatuses = ["Hoàn thành", "Làm lại"];
                  }

                  return availableStatuses.length > 0 ? (
                    availableStatuses.map((s) => (
                      <Button
                        key={s}
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => void changeStatus(detail, s)}
                      >
                        {s}
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Không có thao tác khả dụng với vai trò hiện tại
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Checklist */}
            <h3>Checklist</h3>
            {(detail.fields.checklist || []).map((item) => (
              <label className={styles.check} key={item.id}>
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={pending}
                  onChange={() =>
                    void update(detail, {
                      fields: {
                        ...detail.fields,
                        checklist: (detail.fields.checklist || []).map((r) =>
                          r.id === item.id ? { ...r, done: !r.done } : r,
                        ),
                      },
                    })
                  }
                />
                {item.title}
              </label>
            ))}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const title = String(
                  new FormData(form).get("checklist") || "",
                ).trim();
                if (!title) return;
                void update(detail, {
                  fields: {
                    ...detail.fields,
                    checklist: [
                      ...(detail.fields.checklist || []),
                      { id: crypto.randomUUID(), title, done: false },
                    ],
                  },
                }).then((saved) => {
                  if (saved) form.reset();
                });
              }}
            >
              <label>
                Thêm đầu việc
                <Input name="checklist" required maxLength={500} />
              </label>
              <Button type="submit" variant="secondary" disabled={pending}>
                Thêm checklist
              </Button>
            </form>

            {/* ROUND1-4: Lịch sử trạng thái bất biến */}
            {detail.statusHistory.length > 0 && (
              <details className="rounded-control border border-border p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Lịch sử trạng thái ({detail.statusHistory.length})
                </summary>
                <ol className="mt-2 space-y-2">
                  {detail.statusHistory.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <time
                        className="shrink-0 text-muted-foreground"
                        dateTime={item.timestamp}
                      >
                        {new Date(item.timestamp).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                        })}
                      </time>
                      <div>
                        <StatusBadge status={item.status} />
                        <span className="ml-2 text-muted-foreground">
                          bởi {item.actor} ({item.actorRole})
                        </span>
                        {item.reason && (
                          <p className="text-muted-foreground">
                            — {item.reason}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {/* Lịch sử giao lại */}
            {detail.reassignmentHistory.length > 0 && (
              <details className="rounded-control border border-border p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Lịch sử giao lại ({detail.reassignmentHistory.length})
                </summary>
                <ol className="mt-2 space-y-2">
                  {detail.reassignmentHistory.map((item, idx) => (
                    <li
                      key={idx}
                      className="border-l-2 border-primary pl-3 text-sm"
                    >
                      <p>
                        <strong>{item.fromAssignee}</strong> →{" "}
                        <strong>{item.toAssignee}</strong>
                      </p>
                      <p className="text-muted-foreground">
                        Lý do: {item.reason}
                      </p>
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={item.timestamp}
                      >
                        {new Date(item.timestamp).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                        })}
                      </time>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <TaskComments
              comments={detail.fields.comments || []}
              pending={pending}
              onSubmit={(comment) =>
                update(detail, {
                  fields: {
                    ...detail.fields,
                    comments: [...(detail.fields.comments || []), comment],
                  },
                })
              }
            />
          </div>
          <footer>
            <Button
              variant="secondary"
              onClick={() => {
                setReassigning(detail);
                setDetail(null);
              }}
            >
              Giao lại
            </Button>
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
            <p>Bạn muốn xóa "{deleting.name}"?</p>
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

      {reassigning && (
        <Modal
          title={"Giao lại task: " + reassigning.name}
          onClose={() => setReassigning(null)}
        >
          <ReassignForm
            task={reassigning}
            onClose={() => {
              setReassigning(null);
              recordsChanged();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
