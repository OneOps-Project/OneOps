"use client";
import { useState } from "react";
import type { BoardTask } from "@/features/work-management/work/kanban/types";
import {
  boardLaneHint,
  isTerminalStatus,
} from "@/features/work-management/work/kanban/constants";
import { Badge } from "@/features/work-management/work/kanban/components/primitives/foundations";
import { Select } from "@/features/work-management/work/kanban/components/primitives/forms";
import styles from "@/features/work-management/work/kanban/components/styles.module.css";

export function KanbanBoard({
  tasks,
  statuses,
  pending,
  today,
  onOpen,
  onMove,
}: {
  tasks: BoardTask[];
  statuses: readonly string[];
  pending: boolean;
  today: string;
  onOpen: (id: string) => void;
  onMove: (id: string, status: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const dragging = dragId
    ? (tasks.find((task) => task.id === dragId) ?? null)
    : null;

  const accepts = (lane: string) =>
    Boolean(
      dragging &&
      dragging.status !== lane &&
      !dragging.locked &&
      dragging.available.includes(lane),
    );

  return (
    <div className={styles.board} aria-label="Bảng công việc">
      {statuses.map((lane) => {
        const items = tasks.filter((task) => task.status === lane);
        return (
          <section
            key={lane}
            aria-label={`${lane} (${items.length})`}
            className={`${styles.column} ${accepts(lane) ? styles.target : ""}`}
            onDragOver={(event) => {
              if (accepts(lane)) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain");
              setDragId(null);
              if (accepts(lane) && tasks.some((task) => task.id === id))
                onMove(id, lane);
            }}
          >
            <h2>
              {lane}
              <span aria-hidden="true">{items.length}</span>
            </h2>
            <p className={styles.hint}>{boardLaneHint[lane] ?? ""}</p>
            {!items.length ? (
              <p className={styles.empty}>Chưa có công việc</p>
            ) : (
              items.map((task) => {
                const late =
                  task.date < today && !isTerminalStatus(task.status);
                const targets = [task.status, ...task.available];
                return (
                  <article
                    key={task.id}
                    className={styles.card}
                    draggable={!pending && !task.locked}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", task.id);
                      setDragId(task.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                  >
                    <div className={styles.meta}>
                      <span>{task.code}</span>
                      <span className={styles.tags}>
                        {task.blocked ? (
                          <Badge variant="warning">
                            Chờ {task.blocked} việc
                          </Badge>
                        ) : null}
                        <Badge
                          variant={
                            task.priority === "Khẩn cấp" ? "danger" : "neutral"
                          }
                        >
                          {task.priority || "Trung bình"}
                        </Badge>
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.title}
                      onClick={() => onOpen(task.id)}
                    >
                      {task.name}
                    </button>
                    {task.project && (
                      <p className={styles.project}>{task.project}</p>
                    )}
                    <div className={styles.meta}>
                      <span>{task.assignee || "Chưa phân công"}</span>
                      <span className={late ? styles.late : undefined}>
                        {task.date}
                      </span>
                    </div>
                    <div className={styles.move}>
                      {/* Re-mounts on status change so a refused move snaps back. */}
                      <Select
                        key={task.status}
                        aria-label={`Chuyển trạng thái ${task.code}`}
                        value={task.status}
                        disabled={pending || task.locked || targets.length < 2}
                        onChange={(event) =>
                          onMove(task.id, event.target.value)
                        }
                      >
                        {targets.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                      {task.locked && (
                        <span className={styles.hint}>
                          Chờ Quản lý duyệt đề xuất
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
