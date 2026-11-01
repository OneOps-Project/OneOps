import { createSchema, updateSchema } from "./dto/tickets-approvals.dto.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { Injectable } from "@nestjs/common";
import { TicketsApprovalsRepository } from "./tickets-approvals.repository.js";
import type { RecordInput } from "./dto/tickets-approvals.dto.js";
import type { Transaction } from "../../../../core/database/database.module.js";
import type { ListQuery } from "./dto/tickets-approvals.dto.js";
@Injectable()
export class TicketsApprovalsService {
  constructor(private readonly repository: TicketsApprovalsRepository) {}
  list(query: ListQuery) {
    return this.repository.list(query);
  }
  get(id: string, tx?: Transaction) {
    return this.repository.get(id, tx);
  }
  create(input: RecordInput, tx?: Transaction) {
    return this.repository.create(
      new SchemaPipe(createSchema).transform(input),
      tx,
    );
  }
  update(
    id: string,
    input: Partial<RecordInput> & { version: number },
    tx?: Transaction,
  ) {
    return this.repository.update(
      id,
      new SchemaPipe(updateSchema).transform(input),
      tx,
    );
  }
  remove(id: string, version: number, tx?: Transaction) {
    return this.repository.remove(id, version, tx);
  }
}
