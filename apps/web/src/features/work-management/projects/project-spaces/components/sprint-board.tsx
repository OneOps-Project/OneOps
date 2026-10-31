"use client";
import { useEffect, useState } from "react";
import type {
  BacklogItem,
  Board,
  RecordDto,
  Sprint,
} from "@/features/work-management/projects/project-spaces/types";
import { client } from "@/features/work-management/projects/project-spaces/api/client";
import { useWorkspace } from "@/features/work-management/projects/project-spaces/components/primitives/workspace";
import { Button } from "@/features/work-management/projects/project-spaces/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/work-management/projects/project-spaces/components/primitives/forms";
import { Badge } from "@/features/work-management/projects/project-spaces/components/primitives/foundations";
import styles from "@/features/work-management/projects/project-spaces/components/styles.module.css";

const STATUS: Record<Sprint["status"], string> = {
  PLANNED: "Lập kế hoạch",
  ACTIVE: "Đang chạy",
  CLOSED: "Đã đóng",
};
const TONE = {
  PLANNED: "info",
  ACTIVE: "success",
  CLOSED: "neutral",
} as const;
const COMMITMENT: Record<Sprint["commitment"]["state"], string> = {
  EMPTY: "Chưa cam kết",
  UNDER: "Dưới năng lực",
  BALANCED: "Trong năng lực",
  OVER: "Vượt năng lực",
};
const TODAY = new Date();
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const plus = (days: number) =>
  isoDay(new Date(TODAY.getTime() + days * 24 * 60 * 60 * 1000));

/** Sprint planning board: backlog ranking, commitment and carryover. */
export function SprintBoard({ projects }: { projects: RecordDto[] }) {
  const { notify } = useWorkspace();
  const [choice, setChoice] = useState("");
  const [state, setState] = useState<{
    board: Board | null;
    error: string;
    key: string;
  }>({ board: null, error: "", key: "" });
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    name: "",
    goal: "",
    startDate: isoDay(TODAY),
    endDate: plus(13),
    capacity: "40",
  });
  const [pick, setPick] = useState({ taskId: "", points: "3" });
  const [over, setOver] = useState(false);
  const [carryTo, setCarryTo] = useState("");

  const projectId = choice || projects[0]?.id || "";
  const key = projectId ? `${projectId}:${revision}` : "";
  // The last loaded board is only valid for the key it was fetched with, so
  // staleness is derived here instead of being stored in an effect.
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    client
      .board(projectId, controller.signal)
      .then((next) => setState({ board: next, error: "", key }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setState({
          board: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Không tải được bảng sprint",
          key,
        });
      });
    return () => controller.abort();
  }, [key, projectId]);
  const loading = Boolean(key) && state.key !== key;
  const board = loading ? null : state.board;
  const shown = error || state.error;

  async function run(action: () => Promise<unknown>, message: string) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await action();
      setRevision((value) => value + 1);
      notify(message);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể hoàn tất thao tác",
      );
    } finally {
      setPending(false);
    }
  }

  if (!projects.length)
    return (
      <div className={styles.empty}>
        <h2>Chưa có dự án nào</h2>
        <p>Tạo dự án trước khi lập kế hoạch sprint.</p>
      </div>
    );

  const sprints = board?.sprints ?? [];
  const planned = sprints.filter((sprint) => sprint.status !== "CLOSED");
  const active = sprints.find((sprint) => sprint.status === "ACTIVE");

  function rows(list: readonly BacklogItem[], sprintId: string | null) {
    return (
      <ul className={styles.sprintList}>
        {list.map((item, index) => (
          <li className={styles.sprintRow} key={item.id}>
            <span className={styles.sprintCode}>{item.task?.code ?? "—"}</span>
            <span className={styles.sprintName}>
              {item.task?.name ?? "Công việc không còn tồn tại"}
            </span>
            <span className={styles.sprintPoints}>
              <Input
                aria-label={"Điểm cho " + (item.task?.code ?? item.id)}
                type="number"
                min={0}
                max={100}
                defaultValue={item.points}
                disabled={pending || item.sprintId !== null}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value !== item.points)
                    void run(
                      () => client.updatePoints(projectId, item, value),
                      "Đã cập nhật điểm.",
                    );
                }}
              />
            </span>
            {item.task?.done ? (
              <Badge variant="success">Hoàn thành</Badge>
            ) : (
              <Badge>{item.task?.status ?? "Chưa rõ"}</Badge>
            )}
            {item.carriedTimes > 0 && (
              <Badge variant="warning">Chuyển {item.carriedTimes} lần</Badge>
            )}
            <span className={styles.sprintActions}>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Đưa lên"
                disabled={pending || index === 0}
                onClick={() =>
                  run(
                    () => client.moveItem(projectId, item, sprintId, index - 1),
                    "Đã sắp xếp lại.",
                  )
                }
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Đưa xuống"
                disabled={pending || index === list.length - 1}
                onClick={() =>
                  run(
                    () => client.moveItem(projectId, item, sprintId, index + 1),
                    "Đã sắp xếp lại.",
                  )
                }
              >
                ↓
              </Button>
              <Select
                aria-label={"Chuyển " + (item.task?.code ?? item.id)}
                value={item.sprintId ?? ""}
                disabled={pending}
                onChange={(event) =>
                  run(
                    () =>
                      client.moveItem(
                        projectId,
                        item,
                        event.target.value || null,
                        2000,
                      ),
                    "Đã chuyển công việc.",
                  )
                }
              >
                <option value="">Backlog</option>
                {planned.map((sprint) => (
                  <option value={sprint.id} key={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(
                    () => client.removeItem(projectId, item),
                    "Đã bỏ khỏi kế hoạch.",
                  )
                }
              >
                Bỏ
              </Button>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className={styles.sprintShell}>
      <div className={styles.sprintHead}>
        <div>
          <h2>Kế hoạch sprint</h2>
          <p>
            {board
              ? `Vận tốc trung bình ${board.velocity.average} điểm/sprint · ${board.velocity.closedSprints} sprint đã đóng · gần nhất ${board.velocity.last} điểm`
              : "Chọn dự án để xem backlog và sprint."}
          </p>
        </div>
        <Select
          aria-label="Chọn dự án"
          value={projectId}
          onChange={(event) => setChoice(event.target.value)}
        >
          {projects.map((project) => (
            <option value={project.id} key={project.id}>
              {project.code} · {project.name}
            </option>
          ))}
        </Select>
      </div>

      {(shown || loading) && (
        <div role={shown ? "alert" : "status"} className={shown ? "error" : ""}>
          {shown || "Đang tải bảng sprint…"}
        </div>
      )}

      <section className={styles.sprintTile}>
        <h3>Sprint</h3>
        {!planned.length && (
          <p className={styles.sprintHint}>
            Chưa có sprint nào. Tạo sprint đầu tiên để cam kết khối lượng.
          </p>
        )}
        {planned.map((sprint) => (
          <article className={styles.sprintCard} key={sprint.id}>
            <div className={styles.sprintCardHead}>
              <strong>{sprint.name}</strong>
              <Badge variant={TONE[sprint.status]}>
                {STATUS[sprint.status]}
              </Badge>
              <span className={styles.sprintMeta}>
                {sprint.startDate} → {sprint.endDate}
              </span>
            </div>
            <div className={styles.sprintMeta}>
              Cam kết {sprint.committed}/{sprint.capacity || "—"} điểm ·{" "}
              {COMMITMENT[sprint.commitment.state]} · {sprint.itemCount} việc
              {sprint.status === "ACTIVE" &&
                ` · còn ${sprint.remainingPoints} điểm · ${sprint.daysLeft} ngày`}
            </div>
            <div
              className={styles.sprintBar}
              role="img"
              aria-label={
                "Hoàn thành " +
                sprint.donePoints +
                " trên " +
                (sprint.committed || 0) +
                " điểm"
              }
            >
              <span
                className={styles.sprintBarFill}
                style={{
                  width:
                    (sprint.committed
                      ? Math.min(
                          Math.round(
                            (sprint.donePoints / sprint.committed) * 100,
                          ),
                          100,
                        )
                      : 0) + "%",
                }}
              />
            </div>
            <div className={styles.sprintActions}>
              {sprint.status === "PLANNED" && (
                <>
                  {sprint.commitment.overBy > 0 && (
                    <label className={styles.sprintCheck}>
                      <input
                        type="checkbox"
                        checked={over}
                        onChange={(event) => setOver(event.target.checked)}
                      />
                      Quản lý xác nhận vượt năng lực
                    </label>
                  )}
                  <Button
                    size="sm"
                    disabled={pending || !sprint.itemCount}
                    onClick={() =>
                      run(
                        () => client.activateSprint(projectId, sprint, over),
                        "Sprint đã bắt đầu.",
                      )
                    }
                  >
                    Bắt đầu sprint
                  </Button>
                </>
              )}
              {sprint.status === "ACTIVE" && (
                <>
                  <Select
                    aria-label="Nơi nhận việc chưa xong"
                    value={carryTo}
                    onChange={(event) => setCarryTo(event.target.value)}
                  >
                    <option value="">Việc còn lại về backlog</option>
                    {planned
                      .filter((item) => item.id !== sprint.id)
                      .map((item) => (
                        <option value={item.id} key={item.id}>
                          Chuyển sang {item.name}
                        </option>
                      ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          client.closeSprint(
                            projectId,
                            sprint,
                            carryTo || null,
                          ),
                        "Sprint đã đóng và chốt vận tốc.",
                      )
                    }
                  >
                    Đóng sprint
                  </Button>
                </>
              )}
            </div>
            {sprint.items.length ? (
              rows(sprint.items, sprint.id)
            ) : (
              <p className={styles.sprintHint}>
                Sprint trống: kéo công việc từ backlog sang.
              </p>
            )}
          </article>
        ))}

        <details className={styles.sprintForm}>
          <summary>Tạo sprint mới</summary>
          <div className={styles.sprintFields}>
            <Input
              aria-label="Tên sprint"
              placeholder="Sprint 3"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
            <Input
              aria-label="Mục tiêu sprint"
              placeholder="Mục tiêu của sprint"
              value={form.goal}
              onChange={(event) =>
                setForm({ ...form, goal: event.target.value })
              }
            />
            <Input
              aria-label="Ngày bắt đầu"
              type="date"
              value={form.startDate}
              onChange={(event) =>
                setForm({ ...form, startDate: event.target.value })
              }
            />
            <Input
              aria-label="Ngày kết thúc"
              type="date"
              value={form.endDate}
              onChange={(event) =>
                setForm({ ...form, endDate: event.target.value })
              }
            />
            <Input
              aria-label="Năng lực sprint (điểm)"
              type="number"
              min={0}
              value={form.capacity}
              onChange={(event) =>
                setForm({ ...form, capacity: event.target.value })
              }
            />
            <Button
              size="sm"
              disabled={pending || !form.name.trim()}
              onClick={() =>
                run(
                  () =>
                    client.createSprint(projectId, {
                      name: form.name.trim(),
                      goal: form.goal.trim(),
                      startDate: form.startDate,
                      endDate: form.endDate,
                      capacity: Number(form.capacity) || 0,
                      note: "",
                    }),
                  "Đã tạo sprint.",
                )
              }
            >
              Tạo sprint
            </Button>
          </div>
        </details>
      </section>

      <section className={styles.sprintTile}>
        <h3>Backlog ({board?.backlog.length ?? 0})</h3>
        {board?.backlog.length ? (
          rows(board.backlog, null)
        ) : (
          <p className={styles.sprintHint}>
            Backlog trống. Thêm công việc từ danh sách bên dưới.
          </p>
        )}
        {board?.candidates.length ? (
          <div className={styles.sprintFields}>
            <Select
              aria-label="Công việc cần thêm"
              value={pick.taskId}
              onChange={(event) =>
                setPick({ ...pick, taskId: event.target.value })
              }
            >
              <option value="">Chọn công việc…</option>
              {board.candidates.map((task) => (
                <option value={task.taskId} key={task.taskId}>
                  {task.code} · {task.name}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Điểm ước lượng"
              type="number"
              min={0}
              max={100}
              value={pick.points}
              onChange={(event) =>
                setPick({ ...pick, points: event.target.value })
              }
            />
            <Button
              size="sm"
              disabled={pending || !pick.taskId}
              onClick={() =>
                run(
                  () =>
                    client.addItem(
                      projectId,
                      pick.taskId,
                      Number(pick.points) || 0,
                      null,
                    ),
                  "Đã thêm vào backlog.",
                )
              }
            >
              Thêm vào backlog
            </Button>
          </div>
        ) : (
          <p className={styles.sprintHint}>
            Mọi công việc phù hợp đã nằm trong kế hoạch của dự án.
          </p>
        )}
      </section>

      {sprints.some((sprint) => sprint.status === "CLOSED") && (
        <section className={styles.sprintTile}>
          <h3>Đã đóng</h3>
          <ul className={styles.sprintList}>
            {sprints
              .filter((sprint) => sprint.status === "CLOSED")
              .map((sprint) => (
                <li className={styles.sprintRow} key={sprint.id}>
                  <span className={styles.sprintName}>{sprint.name}</span>
                  <span className={styles.sprintMeta}>
                    {sprint.startDate} → {sprint.endDate} · hoàn thành{" "}
                    {sprint.completed}/{sprint.committed} điểm · chuyển tiếp{" "}
                    {sprint.carried} điểm
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
      {active && (
        <p className={styles.sprintHint}>
          Sprint “{active.name}” đang chạy: chỉ một sprint hoạt động tại một
          thời điểm.
        </p>
      )}
    </div>
  );
}
