import { Injectable } from "@nestjs/common";
import type { Transaction } from "../../../core/database/database.module.js";
import { ChecklogRepository } from "./checklog.repository.js";
import {
  auditInputSchema,
  checklogQuery,
  type AuditInput,
  type ChecklogQuery,
} from "./dto/checklog.dto.js";
import { SchemaPipe } from "../../../core/pipes/validation.pipe.js";
import { redactSnapshot, redactText } from "./redaction.js";
@Injectable()
export class ChecklogService {
  constructor(private readonly repository: ChecklogRepository) {}
  record(event: AuditInput, tx?: Transaction) {
    const input = new SchemaPipe(auditInputSchema).transform(event);
    const entityName =
      input.entityName ||
      String(
        input.after?.name ||
          input.after?.username ||
          input.before?.name ||
          input.before?.username ||
          "",
      );
    return this.repository.record(
      {
        ...input,
        actorName: redactText(input.actorName),
        entityName: redactText(entityName).slice(0, 200),
        before: redactSnapshot(input.before) ?? undefined,
        after: redactSnapshot(input.after) ?? undefined,
      },
      tx,
    );
  }
  async search(query: ChecklogQuery) {
    const result = await this.repository.search(
      new SchemaPipe(checklogQuery).transform(query),
    );
    return {
      ...result,
      items: result.items.map((row) => ({
        ...row,
        actorName: redactText(row.actorName),
        entityName: redactText(row.entityName),
      })),
    };
  }
  async get(id: string) {
    return this.safeDetail(await this.repository.get(id));
  }
  filters() {
    return this.repository.filters();
  }
  async list(entityType: string, entityId: string, page: number) {
    const result = await this.repository.list(entityType, entityId, page);
    return {
      ...result,
      items: result.items.map((row) => this.safeDetail(row)),
    };
  }
  private safeDetail<
    T extends {
      actorName: string;
      entityName: string;
      before: unknown;
      after: unknown;
    },
  >(row: T) {
    return {
      ...row,
      actorName: redactText(row.actorName),
      entityName: redactText(row.entityName),
      before: redactSnapshot(row.before),
      after: redactSnapshot(row.after),
    };
  }
}
