"use client";
import { useState, useEffect } from "react";
import { client } from "@/features/work-management/work/tasks/api/client";
import type { RecordDto } from "@/features/work-management/work/tasks/types";
import { definition } from "@/features/work-management/work/tasks/constants";
import { Button } from "@/features/work-management/work/tasks/components/primitives/button";
import { Input } from "@/features/work-management/work/tasks/components/primitives/forms";
import { Badge } from "@/features/work-management/work/tasks/components/primitives/foundations";
import {
  Modal,
  useWorkspace,
} from "@/features/work-management/work/tasks/components/primitives/workspace";
import { ReassignForm } from "@/features/work-management/work/tasks/components/reassign-form";
import styles from "@/features/work-management/work/tasks/components/styles.module.css";

export function FlaggedTasksPage() {
  const { notify } = useWorkspace();
  const [tasks, setTasks] = useState<RecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<RecordDto | null>(null);
  const [reassigning, setReassigning] = useState<RecordDto | null>(null);

  async function loadFlaggedTasks() {
    setLoading(true);
    setError("");
    try {
      const data = await client.getFlaggedTasks();
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFlaggedTasks();
  }, []);

  const filtered = tasks.filter((task) =>
    `${task.code} ${task.name} ${task.assignee} ${task.reassignmentFlag.reason}`
      .toLocaleLowerCase("vi")
      .includes(query.trim().toLocaleLowerCase("vi")),
  );

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

  return (
    <div className={styles.root}>
      <div className="module-view">
        <section className="records-panel">
          <div className={styles.header}>
            <div>
              <h1>Task cần giao lại</h1>
              <p>
                Danh sách task được đánh dấu cần giao lại do nhân viên nghỉ phép,
                khóa tài khoản hoặc rời team.
              </p>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={loadFlaggedTasks}>
                Làm mới
              </Button>
            </div>
          </div>

          <div className={styles.toolbar}>
            <Input
              aria-label="Tìm kiếm"
              placeholder="Tìm task cần giao lại…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="text-sm text-muted-foreground">
              {filtered.length} mục
            </span>
          </div>

          {error && (
            <div role="alert" className="error">
              {error}
              <Button variant="ghost" onClick={loadFlaggedTasks}>
                Thử lại
              </Button>
            </div>
          )}

          {loading ? (
            <p role="status">Đang tải dữ liệu…</p>
          ) : !filtered.length ? (
            <div className={styles.empty}>
              <h2>Không có task cần giao lại</h2>
              <p>Hiện tại không có task nào được đánh dấu cần giao lại.</p>
            </div>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tiêu đề</th>
                    <th>Người phụ trách</th>
                    <th>Trạng thái</th>
                    <th>Lý do cần giao lại</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <span className="font-mono text-sm">{task.code}</span>
                      </td>
                      <td>
                        <button
                          className="font-medium"
                          onClick={() => setDetail(task)}
                        >
                          {task.name}
                        </button>
                      </td>
                      <td>{task.assignee || "—"}</td>
                      <td>
                        <StatusBadge status={task.status} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Badge variant="warning" className="text-xs">
                            {task.reassignmentFlag.source === "leave_approved"
                              ? "Nghỉ phép"
                              : task.reassignmentFlag.source === "account_locked"
                                ? "Tài khoản khóa"
                                : task.reassignmentFlag.source === "left_team"
                                  ? "Rời team"
                                  : "Khác"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {task.reassignmentFlag.reason}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetail(task)}
                          >
                            Chi tiết
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setReassigning(task)}
                          >
                            Giao lại
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

      {/* Modal chi tiết */}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className={styles.details}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={detail.status} />
              <Badge variant="warning">Cần giao lại</Badge>
            </div>

            <div
              className="rounded-control border border-yellow-400 bg-yellow-50 p-3 dark:border-yellow-600 dark:bg-yellow-950/30"
              role="alert"
            >
              <p className="mb-1 text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                ⚠️ Task này cần giao lại
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Lý do:</strong> {detail.reassignmentFlag.reason}
              </p>
              {detail.reassignmentFlag.timestamp && (
                <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500">
                  Đánh dấu lúc:{" "}
                  {new Date(detail.reassignmentFlag.timestamp).toLocaleString(
                    "vi-VN",
                    { timeZone: "Asia/Ho_Chi_Minh" },
                  )}
                </p>
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
                <dt className="text-muted-foreground">Người phụ trách hiện tại:</dt>
                <dd>{detail.assignee || "—"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground">Người kiểm tra:</dt>
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
          </div>
          <footer>
            <Button
              variant="primary"
              onClick={() => {
                setReassigning(detail);
                setDetail(null);
              }}
            >
              Giao lại ngay
            </Button>
            <Button variant="secondary" onClick={() => setDetail(null)}>
              Đóng
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
              void loadFlaggedTasks();
              notify("Đã giao lại task thành công.");
            }}
          />
        </Modal>
      )}
    </div>
  );
}
