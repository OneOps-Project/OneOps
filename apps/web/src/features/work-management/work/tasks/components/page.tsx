"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  KanbanBoard,
  type BoardTask,
} from "@/features/work-management/work/kanban";
import type { RecordDto } from "@/features/work-management/work/tasks/types";
import {
  definition,
  isLate,
  officeToday,
  reasonRequiredCodes,
  statusTone,
  TERMINAL_STATUSES,
} from "@/features/work-management/work/tasks/constants";
import { client } from "@/features/work-management/work/tasks/api/client";
import { workflow } from "@/features/work-management/work/tasks/api/workflow";
import {
  useModuleRecords,
  recordsChanged,
} from "@/features/work-management/work/tasks/hooks/use-records";
import { useAllowed } from "@/features/work-management/work/tasks/hooks/use-allowed";
import { useBlockers } from "@/features/work-management/work/tasks/hooks/use-blockers";
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
import { TaskDetail } from "@/features/work-management/work/tasks/components/task-detail";
import styles from "@/features/work-management/work/tasks/components/styles.module.css";

const searchable = (record: RecordDto) =>
  [
    record.code,
    record.name,
    record.assignee,
    record.reviewer,
    record.note,
    record.fields.project,
    record.fields.tags,
    record.fields.priority,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("vi");

export function ModulePage({
  initialView = "board",
}: {
  initialView?: "list" | "board";
}) {
  const params = useSearchParams();
  const { openCreate, notify } = useWorkspace();
  const { records, loading, error, reload } = useModuleRecords();
  const allowed = useAllowed(records.map((record) => record.id));
  const blockers = useBlockers(records.map((record) => record.id));
  const [query, setQuery] = useState(params.get("q") || "");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"list" | "board">(initialView);
  const [focusId, setFocusId] = useState<string | null>(params.get("focus"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const today = officeToday();
  const effectiveStatus =
    status === "all" ? "" : status || params.get("status") || "";
  const needle = query.trim().toLocaleLowerCase("vi");
  const filtered = records.filter(
    (record) =>
      (!effectiveStatus || record.status === effectiveStatus) &&
      (!needle || searchable(record).includes(needle)),
  );
  const detail = focusId
    ? (records.find((record) => record.id === focusId) ?? null)
    : null;
  const editing = editingId
    ? (records.find((record) => record.id === editingId) ?? null)
    : null;
  const deleting = deletingId
    ? (records.find((record) => record.id === deletingId) ?? null)
    : null;
  const open = records.filter(
    (record) => !TERMINAL_STATUSES.includes(record.status),
  );
  const late = records.filter((record) => isLate(record, today));
  const completed = records.filter((record) => record.status === "Hoàn thành");

  const boardTasks: BoardTask[] = filtered.map((record) => {
    const entry = allowed.map.get(record.id);
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      status: record.status,
      date: record.date,
      assignee: record.assignee,
      reviewer: record.reviewer,
      priority: record.fields.priority,
      project: record.fields.project,
      available: (entry?.allowed ?? []).map((move) => move.to),
      locked: Boolean(entry?.pendingProposal),
      blocked: blockers.map.get(record.id)?.open ?? 0,
    };
  });

  async function move(taskId: string, to: string) {
    if (pending) return;
    const record = records.find((item) => item.id === taskId);
    const target = allowed.map
      .get(taskId)
      ?.allowed.find((item) => item.to === to);
    if (!record || !target) {
      notify("Không thể chuyển công việc sang trạng thái này.");
      return;
    }
    if (reasonRequiredCodes.includes(target.code)) {
      setFocusId(taskId);
      notify(`Chuyển sang “${to}” cần nhập lý do trong trang chi tiết.`);
      return;
    }
    setPending(true);
    setActionError("");
    try {
      await workflow.transition(taskId, {
        toStatus: to,
        version: record.version,
      });
      recordsChanged();
      allowed.reload();
      blockers.reload();
      notify(`Đã chuyển “${record.code}” sang ${to}.`);
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể chuyển trạng thái",
      );
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
        definition.reviewerLabel,
      ],
      ...filtered.map((record) => [
        record.code,
        record.name,
        record.status,
        record.date,
        record.assignee,
        record.reviewer,
      ]),
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
          <header className="page-header">
            <div>
              <span className="eyebrow">Công việc · Quy trình</span>
              <h1>{definition.title}</h1>
              <p>
                Phân công rõ ràng, chuyển trạng thái theo quy trình và lưu lại
                lịch sử xử lý.
              </p>
            </div>
            <div className="page-actions">
              <Button variant="secondary" onClick={exportCsv}>
                Xuất CSV
              </Button>
              <Button onClick={openCreate}>Tạo mới</Button>
            </div>
          </header>

          <div className={styles.toolbar}>
            <Input
              aria-label="Tìm kiếm công việc"
              placeholder={"Tìm " + definition.singular + "…"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              aria-label="Lọc theo trạng thái"
              value={effectiveStatus}
              onChange={(event) => setStatus(event.target.value || "all")}
            >
              <option value="">Tất cả trạng thái</option>
              {definition.statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
            <div className={styles.toolbarRight}>
              <div
                className="flex gap-2"
                role="group"
                aria-label="Kiểu hiển thị"
              >
                <Button
                  variant={view === "board" ? "primary" : "secondary"}
                  aria-pressed={view === "board"}
                  onClick={() => setView("board")}
                >
                  Bảng
                </Button>
                <Button
                  variant={view === "list" ? "primary" : "secondary"}
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  Danh sách
                </Button>
              </div>
              <Button
                variant="ghost"
                loading={loading}
                onClick={() => {
                  reload();
                  allowed.reload();
                  blockers.reload();
                }}
              >
                Làm mới
              </Button>
              <span className="text-sm text-muted-foreground">
                {filtered.length} mục
              </span>
            </div>
          </div>

          <div className={styles.stats}>
            <Badge variant="neutral" dot>
              {open.length} đang mở
            </Badge>
            <Badge variant={late.length ? "danger" : "neutral"} dot>
              {late.length} quá hạn
            </Badge>
            <Badge variant="success" dot>
              {completed.length} hoàn thành
            </Badge>
          </div>

          {(error || actionError || allowed.error) && (
            <div role="alert" className="error">
              {error || actionError || allowed.error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reload();
                  allowed.reload();
                }}
              >
                Thử lại
              </Button>
            </div>
          )}

          {loading ? (
            <p role="status">Đang tải dữ liệu…</p>
          ) : !filtered.length ? (
            <div className="surface empty-state">
              <h2>Chưa có {definition.singular} phù hợp</h2>
              <p>Tạo nội dung đầu tiên hoặc thay đổi điều kiện tìm kiếm.</p>
              <Button onClick={openCreate}>Tạo mới</Button>
            </div>
          ) : view === "board" ? (
            <KanbanBoard
              tasks={boardTasks}
              statuses={definition.statuses}
              pending={pending}
              today={today}
              onOpen={(id) => setFocusId(id)}
              onMove={(id, to) => void move(id, to)}
            />
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tiêu đề</th>
                    <th>Trạng thái</th>
                    <th>{definition.dateLabel}</th>
                    <th>{definition.personLabel}</th>
                    <th>{definition.reviewerLabel}</th>
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
                          onClick={() => setFocusId(record.id)}
                        >
                          {record.name}
                        </button>
                      </td>
                      <td>
                        <span className={styles.actions}>
                          <Badge variant={statusTone[record.status]} dot>
                            {record.status}
                          </Badge>
                          {Boolean(blockers.map.get(record.id)?.open) && (
                            <Badge variant="warning">
                              Chờ {blockers.map.get(record.id)?.open} việc
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td
                        className={
                          isLate(record, today) ? "text-destructive" : undefined
                        }
                      >
                        {record.date}
                      </td>
                      <td>{record.assignee || "Chưa phân công"}</td>
                      <td>{record.reviewer || "Quản lý phụ trách"}</td>
                      <td>
                        <div className={styles.actions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Sửa ${record.code}`}
                            onClick={() => setEditingId(record.id)}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Xóa ${record.code}`}
                            onClick={() => setDeletingId(record.id)}
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
          )}
        </section>
      </div>

      {detail && (
        <TaskDetail
          key={detail.id}
          task={detail}
          candidates={records.filter((record) => record.id !== detail.id)}
          onChanged={() => {
            allowed.reload();
            blockers.reload();
          }}
          onClose={() => setFocusId(null)}
          onEdit={() => {
            setEditingId(detail.id);
            setFocusId(null);
          }}
          onDelete={() => {
            setDeletingId(detail.id);
            setFocusId(null);
          }}
        />
      )}
      {editing && (
        <Modal
          title={"Chỉnh sửa " + definition.singular}
          onClose={() => setEditingId(null)}
        >
          <RecordForm record={editing} onClose={() => setEditingId(null)} />
        </Modal>
      )}
      {deleting && (
        <Modal title="Xác nhận xóa" onClose={() => setDeletingId(null)}>
          <div className="form-body">
            <p>
              Bạn muốn xóa “{deleting.name}”? Lịch sử chuyển trạng thái và trao
              đổi của công việc sẽ không còn hiển thị.
            </p>
            {actionError && (
              <p className="error" role="alert">
                {actionError}
              </p>
            )}
          </div>
          <footer>
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              loading={pending}
              onClick={async () => {
                if (pending) return;
                setPending(true);
                setActionError("");
                try {
                  await client.remove(deleting);
                  recordsChanged();
                  setDeletingId(null);
                  notify("Đã xóa thành công.");
                } catch (cause) {
                  setActionError(
                    cause instanceof Error ? cause.message : "Không thể xóa",
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
