import { ForbiddenException, Injectable } from "@nestjs/common";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import {
  createSchema,
  summaryQuery,
  updateSchema,
  type ListQuery,
  type PresenceInput,
  type PresencePatch,
} from "./dto/workforce-board.dto.js";
import { WorkforceBoardRepository } from "./workforce-board.repository.js";

@Injectable()
export class WorkforceBoardService {
  constructor(private readonly repository: WorkforceBoardRepository) {}

  private ownOf(actor: ActorContext) {
    return actor.role === "EMPLOYEE" ? actor.employeeId : undefined;
  }

  list(query: ListQuery, actor: ActorContext) {
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && !own)
      return Promise.resolve({
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      });
    return this.repository.list(query, own);
  }

  summary(query: { workDate: string }, actor: ActorContext) {
    const parsed = new SchemaPipe(summaryQuery).transform(query);
    return this.repository.summary(parsed.workDate, this.ownOf(actor));
  }

  create(input: PresenceInput, actor: ActorContext) {
    const parsed = new SchemaPipe(createSchema).transform(input);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && parsed.employeeId !== own)
      throw new ForbiddenException(
        "Chỉ được khai báo trạng thái cho chính mình.",
      );
    return this.repository.create(parsed);
  }

  async update(id: string, patch: PresencePatch, actor: ActorContext) {
    const parsed = new SchemaPipe(updateSchema).transform(patch);
    const current = await this.repository.get(id);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && current.employeeId !== own)
      throw new ForbiddenException("Chỉ được sửa trạng thái của chính mình.");
    return this.repository.update(id, parsed);
  }
}
