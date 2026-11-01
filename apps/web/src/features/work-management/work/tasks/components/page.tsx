"use client";
import { KanbanBoard } from "@/features/work-management/work/kanban";
import { TaskComments } from "@/features/work-management/work/task-comments";
import { useState } from "react";
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
import styles from "@/features/work-management/work/tasks/components/styles.module.css";

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
  const [detail, setDetail] = useState<RecordDto | null>(null),
    [editing, setEditing] = useState<RecordDto | null>(null),
    [deleting, setDeleting] = useState<RecordDto | null>(null),
    [pending, setPending] = useState(false);
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
      (params.get("reassignment") !== "1" ||
        record.fields.reassignmentRequired === true) &&
      (!effectiveStatus || record.status === effectiveStatus) &&
      `${record.id} ${record.code} ${record.name} ${record.assignee} ${record.note} ${Object.values(record.fields).join(" ")}`
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
    link.download = "tasks.csv";
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
              <p>Phân công rõ ràng, theo dõi tiến độ và hoàn thành đúng hạn.</p>
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
                              {record.fields.reassignmentRequired && (
                                <span className="ml-2 text-xs text-warning">
                                  Cần giao lại
                                </span>
                              )}
                            </button>
                          </td>
                          <td>
                            <Select
                              aria-label={"Trạng thái " + record.code}
                              disabled={pending}
                              value={record.status}
                              onChange={(e) =>
                                void update(record, {
                                  status: e.target.value as RecordDto["status"],
                                })
                              }
                            >
                              {definition.statuses.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </Select>
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
                <KanbanBoard
                  records={records}
                  filtered={filtered}
                  statuses={definition.statuses}
                  pending={pending}
                  today={today}
                  onOpen={(id) => {
                    const record = records.find((item) => item.id === id);
                    if (record) setDetail(record);
                  }}
                  onMove={(id, status) => {
                    const record = records.find((item) => item.id === id);
                    if (record)
                      void update(record, {
                        status: status as RecordDto["status"],
                      });
                  }}
                />
              )}
            </>
          )}
        </section>
      </div>
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className={styles.details}>
            {actionError && (
              <p className="error" role="alert">
                {actionError}
              </p>
            )}
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
                        checklist: (detail.fields.checklist || []).map((row) =>
                          row.id === item.id
                            ? { ...row, done: !row.done }
                            : row,
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
