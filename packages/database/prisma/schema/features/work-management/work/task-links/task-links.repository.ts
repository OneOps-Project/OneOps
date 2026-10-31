import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type WorkTaskLink } from "@oneops/database";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import { linkSchema } from "./dto/task-links.dto.js";
import type { LinkDto } from "./dto/task-links.dto.js";

@Injectable()
export class TaskLinksRepository {
  constructor(private readonly db: Database) {}

  private table(tx: Transaction = this.db) {
    return tx.workTaskLink;
  }

  private dto(row: WorkTaskLink): LinkDto {
    return linkSchema.parse({
      id: row.id,
      fromTaskId: row.fromTaskId,
      toTaskId: row.toTaskId,
      type: row.type,
      note: row.note,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
    });
  }

  async create(input: {
    fromTaskId: string;
    toTaskId: string;
    type: string;
    note: string;
    createdById: string | null;
    createdBy: string;
  }) {
    return this.dto(await this.table().create({ data: input }));
  }

  async get(id: string) {
    const row = await this.table().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy liên kết này.");
    return this.dto(row);
  }

  async remove(id: string) {
    const result = await this.table().deleteMany({ where: { id } });
    if (!result.count)
      throw new NotFoundException("Không tìm thấy liên kết này.");
    return { id };
  }

  /** Every link touching the task, in either direction. */
  async ofTask(taskId: string) {
    const rows = await this.table().findMany({
      where: { OR: [{ fromTaskId: taskId }, { toTaskId: taskId }] },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return rows.map((row) => this.dto(row));
  }

  /** Both directions between a pair, used to reject duplicates before insert. */
  async between(firstTaskId: string, secondTaskId: string) {
    const rows = await this.table().findMany({
      where: {
        OR: [
          { fromTaskId: firstTaskId, toTaskId: secondTaskId },
          { fromTaskId: secondTaskId, toTaskId: firstTaskId },
        ],
      },
    });
    return rows.map((row) => this.dto(row));
  }

  async countTouching(taskId: string) {
    return this.table().count({
      where: { OR: [{ fromTaskId: taskId }, { toTaskId: taskId }] },
    });
  }

  /** Outgoing `BLOCKS` edges of the given tasks: the dependency graph. */
  async blocksFrom(taskIds: readonly string[]) {
    if (!taskIds.length) return [];
    const rows = await this.table().findMany({
      where: { fromTaskId: { in: [...taskIds] }, type: "BLOCKS" },
      select: { fromTaskId: true, toTaskId: true },
    });
    return rows;
  }

  /** Incoming `BLOCKS` edges: who is holding the given tasks back. */
  async blocksInto(taskIds: readonly string[]) {
    if (!taskIds.length) return [];
    const where: Prisma.WorkTaskLinkWhereInput = {
      toTaskId: { in: [...taskIds] },
      type: "BLOCKS",
    };
    const rows = await this.db.$transaction(
      (tx) =>
        tx.workTaskLink.findMany({ where, orderBy: { createdAt: "asc" } }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return rows.map((row) => this.dto(row));
  }
}
