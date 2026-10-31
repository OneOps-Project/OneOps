import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@oneops/database";
import type { ProjectBacklogItem, ProjectSprint } from "@oneops/database";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";

export type SprintRow = ProjectSprint;
export type ItemRow = ProjectBacklogItem;

const day = (value: Date) => value.toISOString().slice(0, 10);
export { day as isoDay };

/**
 * Queries for sprints and backlog rows. Only the tables declared in
 * `modules.json` for this feature are touched.
 */
@Injectable()
export class SprintRepository {
  constructor(private readonly db: Database) {}

  private sprints(tx: Transaction = this.db) {
    return tx.projectSprint;
  }

  private items(tx: Transaction = this.db) {
    return tx.projectBacklogItem;
  }

  private projects(tx: Transaction = this.db) {
    return tx.workProject;
  }

  /**
   * Activation and closure read a project-wide invariant (one active sprint,
   * next sprint inside the project), so they run serializable.
   */
  transaction<T>(run: (tx: Transaction) => Promise<T>) {
    return this.db.$transaction(run, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async project(id: string) {
    const row = await this.projects().findUnique({ where: { id } });
    if (!row)
      throw new NotFoundException("Không tìm thấy dự án trong phân hệ này.");
    return row;
  }

  sprintsOf(projectId: string) {
    return this.sprints().findMany({
      where: { projectId },
      orderBy: [{ startDate: "desc" }, { createdAt: "asc" }],
    });
  }

  async sprint(id: string, tx: Transaction = this.db) {
    const row = await this.sprints(tx).findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy sprint này.");
    return row;
  }

  /** Items of a project, backlog first then sprint groups, each by rank. */
  itemsOf(projectId: string, tx: Transaction = this.db) {
    return this.items(tx).findMany({
      where: { projectId },
      orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
    });
  }

  itemsIn(sprintId: string | null, tx: Transaction = this.db) {
    return this.items(tx).findMany({
      where: { sprintId },
      orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
    });
  }

  async item(id: string, tx: Transaction = this.db) {
    const row = await this.items(tx).findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy dòng backlog này.");
    return row;
  }

  async activeSprint(projectId: string, tx: Transaction = this.db) {
    return this.sprints(tx).findFirst({
      where: { projectId, status: "ACTIVE" },
    });
  }

  async maxRank(
    projectId: string,
    sprintId: string | null,
    tx: Transaction = this.db,
  ) {
    const last = await this.items(tx).findFirst({
      where: { projectId, sprintId },
      orderBy: { rank: "desc" },
    });
    return last?.rank ?? 0;
  }

  async createSprint(
    projectId: string,
    input: {
      name: string;
      goal: string;
      startDate: string;
      endDate: string;
      capacity: number;
      note: string;
    },
    tx: Transaction = this.db,
  ) {
    try {
      return await this.sprints(tx).create({
        data: {
          projectId,
          name: input.name,
          goal: input.goal,
          startDate: new Date(input.startDate + "T00:00:00.000Z"),
          endDate: new Date(input.endDate + "T00:00:00.000Z"),
          capacity: input.capacity,
          note: input.note,
        },
      });
    } catch (error) {
      if (this.duplicate(error))
        throw new ConflictException(
          "Tên sprint đã tồn tại trong dự án này. Vui lòng chọn tên khác.",
        );
      throw error;
    }
  }

  async updateSprint(
    id: string,
    version: number,
    patch: {
      name?: string;
      goal?: string;
      startDate?: string;
      endDate?: string;
      capacity?: number;
      note?: string;
      status?: string;
      committed?: number;
      completed?: number;
      carried?: number;
      activatedAt?: Date | null;
      closedAt?: Date | null;
    },
    tx: Transaction = this.db,
  ) {
    const { startDate, endDate, ...rest } = patch;
    const result = await this.sprints(tx).updateMany({
      where: { id, version },
      data: {
        ...rest,
        ...(startDate
          ? { startDate: new Date(startDate + "T00:00:00.000Z") }
          : {}),
        ...(endDate ? { endDate: new Date(endDate + "T00:00:00.000Z") } : {}),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      await this.sprint(id, tx);
      throw new ConflictException(
        "Sprint đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.sprint(id, tx);
  }

  async addItem(
    projectId: string,
    input: { taskId: string; points: number; sprintId: string | null },
    rank: number,
    tx: Transaction = this.db,
  ) {
    try {
      return await this.items(tx).create({
        data: {
          projectId,
          taskId: input.taskId,
          points: input.points,
          sprintId: input.sprintId,
          rank,
        },
      });
    } catch (error) {
      if (this.duplicate(error))
        throw new ConflictException(
          "Công việc này đã có trong backlog của dự án.",
        );
      throw error;
    }
  }

  async updateItem(
    id: string,
    version: number,
    data: {
      points?: number;
      sprintId?: string | null;
      rank?: number;
      carriedFrom?: string | null;
      carriedTimes?: number;
      completedAt?: Date | null;
    },
    tx: Transaction = this.db,
  ) {
    const result = await this.items(tx).updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.item(id, tx);
      throw new ConflictException(
        "Dòng backlog đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.item(id, tx);
  }

  async removeItem(id: string, version: number, tx: Transaction = this.db) {
    const result = await this.items(tx).deleteMany({ where: { id, version } });
    if (result.count !== 1) {
      await this.item(id, tx);
      throw new ConflictException(
        "Dòng backlog đã thay đổi. Vui lòng tải lại.",
      );
    }
    return { id };
  }

  /** Dense renumber so `index` always lands exactly where the planner dropped it. */
  async renumber(
    order: readonly { id: string; version: number }[],
    tx: Transaction,
  ) {
    for (const [index, row] of order.entries())
      await this.items(tx).update({
        where: { id: row.id },
        data: { rank: (index + 1) * 1000, version: { increment: 1 } },
      });
  }

  /** Records the first moment the board saw a task as done. */
  stampCompleted(ids: readonly string[], at: Date) {
    if (!ids.length) return Promise.resolve({ count: 0 });
    return this.items().updateMany({
      where: { id: { in: [...ids] }, completedAt: null },
      data: { completedAt: at },
    });
  }

  async closedSprints(projectId: string) {
    return this.sprints().findMany({
      where: { projectId, status: "CLOSED" },
      orderBy: { closedAt: "asc" },
    });
  }

  private duplicate(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }
}
