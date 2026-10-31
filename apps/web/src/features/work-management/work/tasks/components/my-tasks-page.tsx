"use client";
import { useState, useEffect } from "react";
import { client } from "@/features/work-management/work/tasks/api/client";
import type { MyTaskDto } from "@/features/work-management/work/tasks/types";
import { definition } from "@/features/work-management/work/tasks/constants";
import { Button } from "@/features/work-management/work/tasks/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/work-management/work/tasks/components/primitives/forms";
import { Badge } from "@/features/work-management/work/tasks/components/primitives/foundations";
import {
  Modal,
  useWorkspace,
} from "@/features/work-management/work/tasks/components/primitives/workspace";
import { RecordForm } from "@/features/work-management/work/tasks/components/record-form";
import { ReassignForm } from "@/features/work-management/work/tasks/components/reassign-form";
import { TaskComments } from "@/features/work-management/work/task-comments";
import styles from "@/features/work-management/work/tasks/components/styles.module.css";

// Mock user - sau này lấy từ auth
const MOCK_USER_ID = "user-001";
const MOCK_ACTOR = { id: "user-001", role: "assignee" as const };

export function MyTasksPage() {
  const { notify } = useWorkspace();
  const [tasks, setTasks] = useState<MyTaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState<
    "" | "overdue" | "upcoming"
  >("");
  const [detail, setDetail] = useState<MyTaskDto | null>(null);
  const [editing, setEditing] = useState<MyTaskDto | null>(null);
  const [reassigning, setReassigning] = useState<MyTaskDto | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");

  async function loadMyTasks() {
    setLoading(true);
    setError("");
    try {
      const data = await client.getMyTasks(MOCK_USER_ID);
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMyTasks();
  }, []);

  const filtered = tasks.filter(
    (task) =>
      (!statusFilter || task.status === statusFilter) &&
      (!deadlineFilter || task.deadlineStatus === deadlineFilter) &&
      `${task.code} ${task.name} ${task.assignee} ${task.reviewer} ${task.note}`
        .toLocaleLowerCase("vi")
        .includes(query.trim().toLocaleLowerCase("vi")),
  );

  async function changeStatus(task: MyTaskDto, newStatus: string) {
    if (pending) return false;
    setPending(true);
    setActionError("");
    try {
      const next = await client.changeStatus(task.id, {
        status: newStatus as MyTaskDto["status"],
        actorId: MOCK_ACTOR.id,
        actorRole: MOCK_ACTOR.role,
        reason: "",
      });
      await loadMyTasks();
      setDetail((current) =>
        current?.id === next.id
          ? { ...next, role: task.role, deadlineStatus: task.deadlineStatus }
          : current,
      );
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

  async function update(
    task: MyTaskDto,
    patch: Parameters<typeof client.update>[1],
  ) {
    if (pending) return false;
    setPending(true);
    setActionError("");
    try {
      const next = await client.update(task, patch);
      await loadMyTasks();
      setDetail((current) =>
        current?.id === next.id
          ? { ...next, role: task.role, deadlineStatus: task.deadlineStatus }
          : current,
      );
      notify("Đã cập nhật thành công.");
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Không thể cập nhật");
      return false;
    } finally {
      setPending(false);
    }
  }

  function DeadlineBadge({ task }: { task: MyTaskDto }) {
    if (task.deadlineStatus === "overdue")
      return (
        <Badge variant="danger" dot>
          Quá hạn
        </Badge>
      );
    if (task.deadlineStatus === "upcoming")
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

  return (
    <div className={styles.root}>
      <div className="module-view">
        <section className="records-panel">
          <div className={styles.header}>
            <div>
              <h1>Việc của tôi</h1>
              <p>
                Công việc bạn phụ trách hoặc kiểm tra, sắp xếp theo deadline và
                trạng thái.
              </p>
            </div>
          </div>

          <div className={styles.toolbar}>
            <Input
              aria-label="Tìm kiếm"
              placeholder="Tìm công việc…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              aria-label="Lọc trạng thái"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {definition.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select
              aria-label="Lọc deadline"
              value={deadlineFilter}
              onChange={(e) =>
                setDeadlineFilter(e.target.value as "" | "overdue" | "upcoming")
              }
            >
              <option value="">Tất cả deadline</option>
              <option value="overdue">Quá hạn</option>
              <option value="upcoming">Sắp đến hạn</option>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filtered.length} mục
            </span>
          </div>

          {(error || actionError) && (
            <div role="alert" className="error">
              {error || actionError}
              <Button variant="ghost" onClick={loadMyTasks}>
                Thử lại
              </Button>
            </div>
          )}

          {loading ? (
            <p role="status">Đang tải dữ liệu…</p>
          ) : !filtered.length ? (
            <div className={styles.empty}>
              <h2>Không có công việc nào</h2>
              <p>Bạn chưa có task phụ trách hoặc kiểm tra phù hợp điều kiện.</p>
            </div>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tiêu đề</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Deadline</th>
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
                        <div className="flex items-center gap-2">
                          <button
                            className="font-medium"
                            onClick={() => setDetail(task)}
                          >
                            {task.name}
                          </button>
                          {task.reassignmentFlag.needed && (
                            <Badge variant="warning" className="text-xs">
                              Cần giao lại
                            </Badge>
                          )}
                          {(task.fields.comments?.length ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground">
                              💬 {task.fields.comments!.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            task.role === "assignee" ? "info" : "neutral"
                          }
                        >
                          {task.role === "assignee" ? "Phụ trách" : "Kiểm tra"}
                        </Badge>
                      </td>
                      <td>
                        <StatusBadge status={task.status} />
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-sm">{fmt(task.deadline)}</span>
                          <DeadlineBadge task={task} />
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
                          {task.role === "assignee" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(task)}
                            >
                              Sửa
                            </Button>
                          )}
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
            {actionError && (
              <p className="error" role="alert">
                {actionError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={detail.role === "assignee" ? "info" : "neutral"}>
                {detail.role === "assignee" ? "Phụ trách" : "Kiểm tra"}
              </Badge>
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
              <DeadlineBadge task={detail} />
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
                <dt className="text-muted-foreground">Người phụ trách:</dt>
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

            {/* Cập nhật trạng thái nhanh - Role-based */}
            <div>
              <p className="mb-2 text-sm font-semibold">Cập nhật trạng thái:</p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const currentStatus = detail.status;
                  const role =
                    detail.role === "assignee" ? "assignee" : "reviewer";
                  let availableStatuses: string[] = [];

                  if (role === "assignee") {
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
            {detail.role === "assignee" && (
              <>
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
              </>
            )}
            <Button onClick={() => setDetail(null)}>Đóng</Button>
          </footer>
        </Modal>
      )}

      {editing && (
        <Modal
          title={"Chỉnh sửa " + definition.singular}
          onClose={() => setEditing(null)}
        >
          <RecordForm
            record={editing}
            onClose={() => {
              setEditing(null);
              void loadMyTasks();
            }}
          />
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
              void loadMyTasks();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
