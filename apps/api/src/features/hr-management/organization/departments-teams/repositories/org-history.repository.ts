import { Injectable } from "@nestjs/common";
import { Prisma } from "@oneops/database";
import {
  Database,
  type Transaction,
} from "../../../../../core/database/database.module.js";
import type { HistoryQuery } from "../dto/departments-teams.dto.js";
import type { JsonObject } from "../dto/json-value.dto.js";

export type OrgHistoryData = {
  entityType: "DEPARTMENT" | "TEAM";
  entityId: string;
  action: "CREATE" | "UPDATE" | "DEACTIVATE" | "TRANSFER";
  performedBy: string;
  oldValue?: JsonObject;
  newValue?: JsonObject;
};

@Injectable()
export class OrgHistoryRepository {
  constructor(private readonly db: Database) {}

  create(tx: Transaction, entry: OrgHistoryData) {
    const data: Prisma.OrgHistoryCreateInput = {
      ...entry,
      ...(entry.oldValue ? { oldValue: entry.oldValue } : {}),
      ...(entry.newValue ? { newValue: entry.newValue } : {}),
    };
    return tx.orgHistory.create({ data });
  }

  async list(
    entityType: "DEPARTMENT" | "TEAM",
    entityId: string,
    query: HistoryQuery,
  ) {
    const where = { entityType, entityId };
    const [items, total] = await this.db.$transaction(
      [
        this.db.orgHistory.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.db.orgHistory.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
