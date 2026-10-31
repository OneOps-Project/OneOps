"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RecordDto } from "@/features/work-management/projects/project-spaces/types";
import { definition } from "@/features/work-management/projects/project-spaces/constants";
import { client } from "@/features/work-management/projects/project-spaces/api/client";
import {
  useModuleRecords,
  recordsChanged,
} from "@/features/work-management/projects/project-spaces/hooks/use-records";
import {
  Modal,
  useWorkspace,
} from "@/features/work-management/projects/project-spaces/components/primitives/workspace";
import { Button } from "@/features/work-management/projects/project-spaces/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/work-management/projects/project-spaces/components/primitives/forms";
import { Badge } from "@/features/work-management/projects/project-spaces/components/primitives/foundations";
import { RecordForm } from "@/features/work-management/projects/project-spaces/components/record-form";
import { SprintBoard } from "@/features/work-management/projects/project-spaces/components/sprint-board";
import styles from "@/features/work-management/projects/project-spaces/components/styles.module.css";

type View = "cards" | "list" | "sprint";

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
  const [view, setView] = useState<View>("cards");
  const effectiveStatus =
    status === "all" ? "" : status || params.get("status") || "";
  const filtered = records.filter(
    (record) =>
      (!effectiveStatus || record.status === effectiveStatus) &&
      `${record.code} ${record.name} ${record.assignee} ${record.note} ${Object.values(record.fields).join(" ")}`
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
    try {
      const next = await client.update(record, patch);
      setDetail((current) => (current?.id === next.id ? next : current));
      recordsChanged();
      notify("Đã cập nhật thành công.");
      return true;
    } catch (e) {
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
    link.download = "projects.csv";
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
              <p>Tập trung mục tiêu, người phụ trách và tiến độ dự án.</p>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={exportCsv}>
                Xuất CSV
              </Button>
              <Button onClick={openCreate}>Tạo mới</Button>
            </div>
          </div>

          <div className={styles.toolbar}>
            {view !== "sprint" && (
              <>
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
              </>
            )}
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
              variant={view === "sprint" ? "primary" : "secondary"}
              onClick={() => setView("sprint")}
            >
              Sprint
            </Button>
            {view !== "sprint" && (
              <span className="text-sm text-muted-foreground">
                {filtered.length} mục
              </span>
            )}
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
          ) : view === "sprint" ? (
            <SprintBoard projects={records} />
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
