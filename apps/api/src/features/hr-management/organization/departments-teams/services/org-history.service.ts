import { Injectable } from "@nestjs/common";
import type { HistoryQuery } from "../dto/departments-teams.dto.js";
import {
  OrgHistoryRepository,
  type OrgHistoryData,
} from "../repositories/org-history.repository.js";
import type { Transaction } from "../../../../../core/database/database.module.js";

@Injectable()
export class OrgHistoryService {
  constructor(private readonly repository: OrgHistoryRepository) {}

  record(tx: Transaction, entry: OrgHistoryData) {
    return this.repository.create(tx, entry);
  }

  list(
    entityType: "DEPARTMENT" | "TEAM",
    entityId: string,
    query: HistoryQuery,
  ) {
    return this.repository.list(entityType, entityId, query);
  }
}
