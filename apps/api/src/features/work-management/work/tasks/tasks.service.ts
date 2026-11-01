import {
  validatedCreateSchema as createSchema,
  updateSchema,
} from "./dto/tasks.dto.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { Injectable } from "@nestjs/common";
import { TasksRepository } from "./tasks.repository.js";
import type { RecordInput } from "./dto/tasks.dto.js";
import type { Transaction } from "../../../../core/database/database.module.js";
import type { ListQuery } from "./dto/tasks.dto.js";
@Injectable()
export class TasksService {
  constructor(private readonly repository: TasksRepository) {}
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
    if (patch.fields) patch.fields = { ...current.fields, ...patch.fields };
    if (patch.assignee !== undefined && patch.assignee !== current.assignee) {
      patch.fields = {
        ...current.fields,
        ...patch.fields,
        reassignmentRequired: false,
      };
      if (patch.fields.assigneeAccountId === current.fields.assigneeAccountId)
        delete patch.fields.assigneeAccountId;
    }
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
  bindAccountUsername(
    account: { id: string; username: string },
    tx: Transaction,
  ) {
    return this.repository.bindAccountUsername(account, tx);
  }
  flagAccountTasks(
    account: {
      id: string;
      employeeId: string;
      employeeCode: string;
      username: string;
    },
    actorId: string,
    tx: Transaction,
  ) {
    return this.repository.flagAccountTasks(account, actorId, tx);
  }
  remove(id: string, version: number, tx?: Transaction) {
    return this.repository.remove(id, version, tx);
  }
}
