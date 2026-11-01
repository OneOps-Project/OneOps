import {
  validatedCreateSchema as createSchema,
  updateSchema,
} from "./dto/calendar.dto.js";
import { SchemaPipe } from "../../../../../core/pipes/validation.pipe.js";
import { Injectable } from "@nestjs/common";
import { CalendarRepository } from "./calendar.repository.js";
import type { RecordInput } from "./dto/calendar.dto.js";
import type { Transaction } from "../../../../../core/database/database.module.js";
import type { ListQuery } from "./dto/calendar.dto.js";
@Injectable()
export class CalendarService {
  constructor(private readonly repository: CalendarRepository) {}
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
  async update(
    id: string,
    input: Partial<RecordInput> & { version: number },
    tx?: Transaction,
  ) {
    const patch = new SchemaPipe(updateSchema).transform(input);
    const current = await this.repository.get(id, tx);
    new SchemaPipe(createSchema).transform({
      code: current.code,
      name: current.name,
      status: current.status,
      date: current.date,
      scope: current.scope,
      assignee: current.assignee,
      note: current.note,
      fields: current.fields,
      ...Object.fromEntries(
        Object.entries(patch).filter(([key]) => key !== "version"),
      ),
    });
    return this.repository.update(id, patch, tx);
  }
  remove(id: string, version: number, tx?: Transaction) {
    return this.repository.remove(id, version, tx);
  }
}
