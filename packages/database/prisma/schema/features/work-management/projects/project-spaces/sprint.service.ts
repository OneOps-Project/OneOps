import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import {
  COMMITMENT_TOLERANCE,
  backlogItemSchema,
  boardSchema,
  commitmentSchema,
  metricsSchema,
  sprintSchema,
  sprintTaskSchema,
} from "./dto/sprints.dto.js";
import type {
  ActivateSprintInput,
  AddItemInput,
  BacklogItemDto,
  BoardDto,
  CloseSprintInput,
  CommitmentDto,
  CreateSprintInput,
  MetricsDto,
  MoveItemInput,
  SprintDto,
  SprintStatus,
  SprintTaskDto,
  UpdateSprintInput,
} from "./dto/sprints.dto.js";
import { SprintRepository, isoDay } from "./sprint.repository.js";
import type { ItemRow, SprintRow } from "./sprint.repository.js";
import {
  SPRINT_TASKS,
  type SprintTaskPort,
  type SprintTaskSnapshot,
} from "./sprint-task.port.js";

const DONE_STATUS = "Hoàn thành";
const DAY = 24 * 60 * 60 * 1000;

/** Sprints, backlog ranking, capacity commitment and carryover for a project. */
@Injectable()
export class SprintService {
  constructor(
    private readonly repository: SprintRepository,
    @Inject(SPRINT_TASKS) private readonly tasks: SprintTaskPort,
  ) {}

  /** Everything the planner screen needs in one read. */
  async board(projectId: string): Promise<BoardDto> {
    const project = await this.repository.project(projectId);
    const [sprints, items] = await Promise.all([
      this.repository.sprintsOf(projectId),
      this.repository.itemsOf(projectId),
    ]);
    const snapshots = await this.snapshots(items.map((item) => item.taskId));
    await this.stamp(items, snapshots);
    const candidates = await this.tasks.candidates(
      project.scope,
      items.map((item) => item.taskId),
    );
    const closed = sprints.filter((sprint) => sprint.status === "CLOSED");
    const lastClosed = closed.at(-1);
    return boardSchema.parse({
      projectId,
      sprints: sprints.map((sprint) =>
        this.sprintDto(sprint, this.itemsOfSprint(sprint.id, items), snapshots),
      ),
      backlog: items
        .filter((item) => item.sprintId === null)
        .map((item) => this.itemDto(item, snapshots)),
      candidates: candidates.map((task) => this.taskDto(task)),
      velocity: {
        closedSprints: closed.length,
        average: this.average(closed.map((sprint) => sprint.completed)),
        last: lastClosed?.completed ?? 0,
      },
    });
  }

  /** Velocity history and the burndown of the running sprint. */
  async metrics(projectId: string): Promise<MetricsDto> {
    await this.repository.project(projectId);
    const closed = await this.repository.closedSprints(projectId);
    const active = await this.repository.activeSprint(projectId);
    let burndown: MetricsDto["active"] = null;
    if (active) {
      const items = await this.repository.itemsIn(active.id);
      const committed = active.committed || this.sum(items);
      burndown = {
        id: active.id,
        name: active.name,
        startDate: isoDay(active.startDate),
        endDate: isoDay(active.endDate),
        committed,
        remaining: committed - this.donePoints(items),
        burndown: this.burndown(active, items, committed),
      };
    }
    return metricsSchema.parse({
      projectId,
      velocity: closed.map((sprint) => ({
        id: sprint.id,
        name: sprint.name,
        committed: sprint.committed,
        completed: sprint.completed,
        carried: sprint.carried,
        days: this.span(isoDay(sprint.startDate), isoDay(sprint.endDate)),
      })),
      averageVelocity: this.average(closed.map((sprint) => sprint.completed)),
      active: burndown,
    });
  }

  async createSprint(
    projectId: string,
    input: Required<CreateSprintInput>,
  ): Promise<SprintDto> {
    await this.repository.project(projectId);
    const row = await this.repository.createSprint(projectId, input);
    return this.sprintDto(row, [], new Map());
  }

  async updateSprint(
    projectId: string,
    id: string,
    input: UpdateSprintInput & { version: number },
  ): Promise<SprintDto> {
    const { version, ...patch } = input;
    const current = await this.sameSprint(projectId, id);
    if (current.status === "CLOSED")
      throw new ConflictException("Sprint đã đóng, không thể chỉnh sửa.");
    const row = await this.repository.updateSprint(id, version, patch);
    const items = await this.repository.itemsIn(id);
    return this.sprintDto(row, items, await this.snapshotsOf(items));
  }

  /**
   * Starting a sprint commits the plan: the gate refuses an empty sprint and a
   * commitment above capacity+25%, and only a manager may accept the remaining
   * over-commitment explicitly.
   */
  async activate(
    projectId: string,
    id: string,
    input: Required<ActivateSprintInput>,
    actor: ActorContext,
  ): Promise<SprintDto> {
    const sprint = await this.sameSprint(projectId, id);
    if (sprint.status !== "PLANNED")
      throw new ConflictException(
        "Chỉ sprint đang lập kế hoạch mới có thể bắt đầu.",
      );
    const items = await this.repository.itemsIn(id);
    if (!items.length)
      throw new UnprocessableEntityException(
        "Sprint chưa có công việc nào. Hãy thêm việc từ backlog trước khi bắt đầu.",
      );
    const committed = this.sum(items);
    this.assertCapacity(sprint, committed, input.overCapacity, actor);
    const row = await this.repository.transaction(async (tx) => {
      const running = await this.repository.activeSprint(projectId, tx);
      if (running && running.id !== id)
        throw new ConflictException(
          `Sprint “${running.name}” đang diễn ra. Hãy đóng sprint đó trước.`,
        );
      return this.repository.updateSprint(
        id,
        input.version,
        { status: "ACTIVE", committed, activatedAt: new Date() },
        tx,
      );
    });
    const snapshots = await this.snapshotsOf(items);
    return this.sprintDto(row, items, snapshots);
  }

  /**
   * Closing a sprint snapshots velocity and moves every unfinished row to the
   * next sprint or back to the backlog, counting how often it has been carried.
   */
  async close(
    projectId: string,
    id: string,
    input: CloseSprintInput & { version: number },
  ): Promise<BoardDto> {
    const sprint = await this.sameSprint(projectId, id);
    if (sprint.status === "CLOSED")
      throw new ConflictException("Sprint này đã được đóng.");
    if (sprint.status !== "ACTIVE")
      throw new ConflictException("Chỉ sprint đang diễn ra mới có thể đóng.");
    const nextId = input.nextSprintId ?? null;
    if (nextId) {
      const next = await this.repository.sprint(nextId);
      if (next.projectId !== projectId)
        throw new UnprocessableEntityException(
          "Sprint kế tiếp phải thuộc cùng dự án.",
        );
      if (next.status === "CLOSED" || next.id === id)
        throw new ConflictException(
          "Sprint kế tiếp phải là sprint chưa bắt đầu hoặc đang lập kế hoạch.",
        );
    }
    const items = await this.repository.itemsIn(id);
    const snapshots = await this.snapshotsOf(items);
    const done = items.filter((item) => this.isDone(item, snapshots));
    const undone = items.filter((item) => !this.isDone(item, snapshots));
    const committed = sprint.committed || this.sum(items);
    const completed = done.reduce((total, item) => total + item.points, 0);
    const carried = undone.reduce((total, item) => total + item.points, 0);
    await this.repository.transaction(async (tx) => {
      let rank = await this.repository.maxRank(projectId, nextId, tx);
      for (const item of undone) {
        rank += 1000;
        await this.repository.updateItem(
          item.id,
          item.version,
          {
            sprintId: nextId,
            carriedFrom: sprint.id,
            carriedTimes: item.carriedTimes + 1,
            rank,
          },
          tx,
        );
      }
      await this.repository.updateSprint(
        id,
        input.version,
        {
          status: "CLOSED",
          committed,
          completed,
          carried,
          closedAt: new Date(),
          note: this.appended(
            sprint.note,
            `Đóng sprint: ${completed}/${committed} điểm hoàn thành, ${carried} điểm chuyển tiếp${
              nextId ? "" : " về backlog"
            }.`,
          ),
        },
        tx,
      );
    });
    return this.board(projectId);
  }

  async addItem(
    projectId: string,
    input: AddItemInput,
  ): Promise<BacklogItemDto> {
    await this.repository.project(projectId);
    const [task] = await this.tasks.snapshots([input.taskId]);
    if (!task)
      throw new UnprocessableEntityException(
        "Công việc không tồn tại trong phân hệ công việc.",
      );
    const sprintId = input.sprintId ?? null;
    if (sprintId) await this.assignableSprint(projectId, sprintId);
    const rank = (await this.repository.maxRank(projectId, sprintId)) + 1000;
    const row = await this.repository.addItem(
      projectId,
      { taskId: input.taskId, points: input.points ?? 0, sprintId },
      rank,
    );
    return this.itemDto(row, new Map([[task.id, task]]));
  }

  async updateItem(
    projectId: string,
    itemId: string,
    input: { points: number; version: number },
  ): Promise<BacklogItemDto> {
    const item = await this.sameItem(projectId, itemId);
    await this.assertOpen(item);
    const row = await this.repository.updateItem(itemId, input.version, {
      points: input.points,
    });
    return this.itemDto(row, await this.snapshotsOf([row]));
  }

  /** Drag and drop: reassigns the row and renumbers the target list densely. */
  async moveItem(
    projectId: string,
    itemId: string,
    input: MoveItemInput & { version: number },
  ): Promise<BoardDto> {
    const item = await this.sameItem(projectId, itemId);
    await this.assertOpen(item);
    if (input.sprintId) await this.assignableSprint(projectId, input.sprintId);
    await this.repository.transaction(async (tx) => {
      const others = (await this.repository.itemsIn(input.sprintId, tx)).filter(
        (entry) => entry.id !== itemId,
      );
      const order = others.map((entry) => ({
        id: entry.id,
        version: entry.version,
      }));
      order.splice(Math.min(input.index, order.length), 0, {
        id: item.id,
        version: input.version,
      });
      await this.repository.updateItem(
        item.id,
        input.version,
        { sprintId: input.sprintId },
        tx,
      );
      await this.repository.renumber(order, tx);
    });
    return this.board(projectId);
  }

  async removeItem(
    projectId: string,
    itemId: string,
    version: number,
  ): Promise<{ id: string }> {
    const item = await this.sameItem(projectId, itemId);
    await this.assertOpen(item);
    return this.repository.removeItem(itemId, version);
  }

  private async sameSprint(projectId: string, id: string) {
    const row = await this.repository.sprint(id);
    if (row.projectId !== projectId)
      throw new NotFoundException("Sprint không thuộc dự án này.");
    return row;
  }

  private async sameItem(projectId: string, id: string) {
    const row = await this.repository.item(id);
    if (row.projectId !== projectId)
      throw new NotFoundException("Dòng backlog không thuộc dự án này.");
    return row;
  }

  /** A target sprint must belong to the project and still be open. */
  private async assignableSprint(projectId: string, sprintId: string) {
    const sprint = await this.sameSprint(projectId, sprintId);
    if (sprint.status === "CLOSED")
      throw new ConflictException(
        "Sprint đã đóng, không thể thêm hoặc chuyển công việc vào.",
      );
    return sprint;
  }

  private async assertOpen(item: ItemRow) {
    if (!item.sprintId) return;
    const sprint = await this.repository.sprint(item.sprintId);
    if (sprint.status === "CLOSED")
      throw new ConflictException(
        "Công việc nằm trong sprint đã đóng, không thể thay đổi.",
      );
  }

  private assertCapacity(
    sprint: SprintRow,
    committed: number,
    overCapacity: boolean,
    actor: ActorContext,
  ) {
    if (!sprint.capacity) return;
    const hardLimit = sprint.capacity * COMMITMENT_TOLERANCE;
    if (committed > hardLimit)
      throw new UnprocessableEntityException(
        `Cam kết ${committed} điểm vượt quá ${Math.round(
          COMMITMENT_TOLERANCE * 100 - 100,
        )}% năng lực ${sprint.capacity} điểm. Hãy bỏ bớt công việc hoặc tăng năng lực sprint.`,
      );
    if (committed > sprint.capacity && !overCapacity)
      throw new UnprocessableEntityException(
        `Cam kết ${committed} điểm vượt năng lực ${sprint.capacity} điểm. Quản lý cần xác nhận vượt năng lực để tiếp tục.`,
      );
    if (committed > sprint.capacity && !this.isManager(actor))
      throw new ForbiddenException(
        "Chỉ Quản lý được xác nhận cam kết vượt năng lực sprint.",
      );
  }

  /** Rows the board already knew as done keep their first completion stamp. */
  private async stamp(
    items: readonly ItemRow[],
    snapshots: ReadonlyMap<string, SprintTaskSnapshot>,
  ) {
    const done = items.filter(
      (item) => !item.completedAt && this.isDone(item, snapshots),
    );
    if (!done.length) return;
    const at = new Date();
    await this.repository.stampCompleted(
      done.map((item) => item.id),
      at,
    );
    for (const item of done) item.completedAt = at;
  }

  private burndown(
    sprint: SprintRow,
    items: readonly ItemRow[],
    committed: number,
  ) {
    const start = isoDay(sprint.startDate);
    const end = isoDay(sprint.endDate);
    const today = this.today();
    const last = today < end ? today : end;
    const points = [];
    for (
      let cursor = start, guard = 0;
      cursor <= last && guard < 120;
      guard++
    ) {
      const dayEnd = new Date(cursor + "T23:59:59.999Z");
      const finished = items
        .filter((item) => item.completedAt && item.completedAt <= dayEnd)
        .reduce((total, item) => total + item.points, 0);
      points.push({
        date: cursor,
        remaining: Math.max(committed - finished, 0),
      });
      const next = new Date(
        new Date(cursor + "T00:00:00.000Z").getTime() + DAY,
      );
      cursor = isoDay(next);
    }
    return points;
  }

  private sprintDto(
    row: SprintRow,
    items: readonly ItemRow[],
    snapshots: ReadonlyMap<string, SprintTaskSnapshot>,
  ): SprintDto {
    const plannedPoints = this.sum(items);
    const donePoints = this.donePoints(items, snapshots);
    const committed = row.status === "PLANNED" ? plannedPoints : row.committed;
    const status = row.status as SprintStatus;
    return sprintSchema.parse({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      goal: row.goal,
      status,
      startDate: isoDay(row.startDate),
      endDate: isoDay(row.endDate),
      capacity: row.capacity,
      committed,
      completed: row.completed,
      carried: row.carried,
      itemCount: items.length,
      doneCount: items.filter((item) => this.isDone(item, snapshots)).length,
      plannedPoints,
      donePoints,
      remainingPoints: Math.max(committed - donePoints, 0),
      daysLeft: Math.max(this.span(this.today(), isoDay(row.endDate)) - 1, 0),
      committedOnPlan: status !== "ACTIVE" || committed === plannedPoints,
      activatedAt: row.activatedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      note: row.note,
      commitment: this.commitment(row.capacity, committed),
      items: items.map((item) => this.itemDto(item, snapshots)),
      version: row.version,
    });
  }

  private itemDto(
    row: ItemRow,
    snapshots: ReadonlyMap<string, SprintTaskSnapshot>,
  ): BacklogItemDto {
    const task = snapshots.get(row.taskId);
    return backlogItemSchema.parse({
      id: row.id,
      projectId: row.projectId,
      taskId: row.taskId,
      sprintId: row.sprintId,
      rank: row.rank,
      points: row.points,
      carriedFrom: row.carriedFrom,
      carriedTimes: row.carriedTimes,
      completedAt: row.completedAt?.toISOString() ?? null,
      version: row.version,
      task: task ? this.taskDto(task) : null,
    });
  }

  private taskDto(task: SprintTaskSnapshot): SprintTaskDto {
    return sprintTaskSchema.parse({
      taskId: task.id,
      code: task.code,
      name: task.name,
      status: task.status,
      assignee: task.assignee,
      done: task.status === DONE_STATUS,
    });
  }

  /** Planning signal: how far the commitment sits from the declared capacity. */
  private commitment(capacity: number, committed: number): CommitmentDto {
    const ratio = capacity ? Math.round((committed / capacity) * 100) / 100 : 0;
    const state = !committed
      ? "EMPTY"
      : !capacity
        ? "EMPTY"
        : ratio > 1
          ? "OVER"
          : ratio < 0.6
            ? "UNDER"
            : "BALANCED";
    return commitmentSchema.parse({
      capacity,
      committed,
      ratio,
      overBy: capacity ? Math.max(committed - capacity, 0) : 0,
      state,
    });
  }

  private itemsOfSprint(sprintId: string, items: readonly ItemRow[]) {
    return items.filter((item) => item.sprintId === sprintId);
  }

  private async snapshotsOf(items: readonly ItemRow[]) {
    return this.snapshots(items.map((item) => item.taskId));
  }

  private async snapshots(taskIds: readonly string[]) {
    const unique = [...new Set(taskIds)];
    if (!unique.length) return new Map<string, SprintTaskSnapshot>();
    const list = await this.tasks.snapshots(unique);
    return new Map(list.map((task) => [task.id, task]));
  }

  private isDone(
    item: ItemRow,
    snapshots: ReadonlyMap<string, SprintTaskSnapshot>,
  ) {
    return snapshots.get(item.taskId)?.status === DONE_STATUS;
  }

  private sum(items: readonly ItemRow[]) {
    return items.reduce((total, item) => total + item.points, 0);
  }

  private donePoints(
    items: readonly ItemRow[],
    snapshots?: ReadonlyMap<string, SprintTaskSnapshot>,
  ) {
    return items
      .filter((item) =>
        snapshots ? this.isDone(item, snapshots) : Boolean(item.completedAt),
      )
      .reduce((total, item) => total + item.points, 0);
  }

  private average(values: readonly number[]) {
    if (!values.length) return 0;
    return Math.round(
      values.reduce((total, value) => total + value, 0) / values.length,
    );
  }

  private span(from: string, to: string) {
    return Math.max(
      Math.round(
        (new Date(to + "T00:00:00.000Z").getTime() -
          new Date(from + "T00:00:00.000Z").getTime()) /
          DAY,
      ) + 1,
      0,
    );
  }

  private appended(note: string, line: string) {
    return note ? `${note}\n${line}` : line;
  }

  private isManager(actor: ActorContext) {
    return actor.role === "MANAGER" || actor.isSystemAdmin;
  }

  private today() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
}
