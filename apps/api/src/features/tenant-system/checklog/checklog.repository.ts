import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@oneops/database";
import { z } from "zod";
import {
  Database,
  type Transaction,
} from "../../../core/database/database.module.js";
import type { AuditInput, ChecklogQuery } from "./dto/checklog.dto.js";
const selectSummary = {
  id: true,
  module: true,
  actorId: true,
  actorName: true,
  action: true,
  entityType: true,
  entityId: true,
  entityName: true,
  result: true,
  createdAt: true,
} as const;
@Injectable()
export class ChecklogRepository {
  constructor(private readonly db: Database) {}
  record(input: AuditInput, tx: Transaction = this.db) {
    return tx.auditEntry.create({
      data: {
        ...input,
        before: input.before
          ? (input.before as Prisma.InputJsonObject)
          : Prisma.JsonNull,
        after: input.after
          ? (input.after as Prisma.InputJsonObject)
          : Prisma.JsonNull,
      },
    });
  }
  private where(query: ChecklogQuery): Prisma.AuditEntryWhereInput {
    const where: Prisma.AuditEntryWhereInput = {};
    for (const key of [
      "module",
      "action",
      "entityType",
      "entityId",
      "result",
    ] as const)
      if (query[key]) where[key] = query[key];
    const conditions: Prisma.AuditEntryWhereInput[] = [];
    if (query.q) {
      const match = { contains: query.q, mode: "insensitive" as const };
      conditions.push({
        OR: [
          { actorName: match },
          { action: match },
          { entityName: match },
          { entityType: match },
          { module: match },
          ...(z.uuid().safeParse(query.q).success
            ? [{ entityId: query.q }, { actorId: query.q }, { id: query.q }]
            : []),
        ],
      });
    }
    if (query.actor) {
      const match = { contains: query.actor, mode: "insensitive" as const };
      conditions.push({
        OR: [
          { actorName: match },
          ...(z.uuid().safeParse(query.actor).success
            ? [{ actorId: query.actor }]
            : []),
        ],
      });
    }
    if (conditions.length) where.AND = conditions;
    if (query.from || query.to) {
      const date: Prisma.DateTimeFilter = {};
      if (query.from) date.gte = new Date(query.from + "T00:00:00+07:00");
      if (query.to) {
        const end = new Date(query.to + "T00:00:00+07:00");
        end.setUTCDate(end.getUTCDate() + 1);
        date.lt = end;
      }
      where.createdAt = date;
    }
    return where;
  }
  search(query: ChecklogQuery) {
    const where = this.where(query);
    return this.db.$transaction(
      async (tx) => {
        const items = await tx.auditEntry.findMany({
          where,
          select: selectSummary,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        const counts = await tx.auditEntry.groupBy({
          by: ["result"],
          where,
          _count: true,
        });
        const summary = { success: 0, failure: 0, denied: 0 };
        for (const row of counts) {
          if (row.result === "SUCCESS") summary.success = row._count;
          if (row.result === "FAILURE") summary.failure = row._count;
          if (row.result === "DENIED") summary.denied = row._count;
        }
        return {
          items,
          total: counts.reduce((total, row) => total + row._count, 0),
          page: query.page,
          pageSize: query.pageSize,
          summary,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async get(id: string) {
    const row = await this.db.auditEntry.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy sự kiện nhật ký.");
    return row;
  }
  filters() {
    return this.db.$transaction(
      async (tx) => {
        const modules = await tx.auditEntry.findMany({
          distinct: ["module"],
          select: { module: true },
          orderBy: { module: "asc" },
          take: 200,
        });
        const actions = await tx.auditEntry.findMany({
          distinct: ["action"],
          select: { action: true },
          orderBy: { action: "asc" },
          take: 200,
        });
        const types = await tx.auditEntry.findMany({
          distinct: ["entityType"],
          select: { entityType: true },
          orderBy: { entityType: "asc" },
          take: 200,
        });
        return {
          modules: modules.map((row) => row.module),
          actions: actions.map((row) => row.action),
          entityTypes: types.map((row) => row.entityType),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  list(entityType: string, entityId: string, page: number) {
    const where = { entityType, entityId };
    return this.db.$transaction(
      async (tx) => ({
        items: await tx.auditEntry.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * 20,
          take: 20,
        }),
        total: await tx.auditEntry.count({ where }),
        page,
        pageSize: 20,
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
