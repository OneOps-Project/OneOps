import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import {
  createSchema,
  decisionSchema,
  updateSchema,
  versionSchema,
  type DecisionInput,
  type ExplanationInput,
  type ExplanationPatch,
  type ListQuery,
} from "./dto/checkin-explanations.dto.js";
import { CheckinExplanationsRepository } from "./checkin-explanations.repository.js";

@Injectable()
export class CheckinExplanationsService {
  constructor(private readonly repository: CheckinExplanationsRepository) {}

  private ownOf(actor: ActorContext) {
    return actor.role === "EMPLOYEE" ? actor.employeeId : undefined;
  }

  private async owned(id: string, actor: ActorContext) {
    const current = await this.repository.get(id);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && current.employeeId !== own)
      throw new ForbiddenException(
        "Chỉ được xử lý đơn giải trình của chính mình.",
      );
    return current;
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

  create(input: ExplanationInput, actor: ActorContext) {
    const parsed = new SchemaPipe(createSchema).transform(input);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && parsed.employeeId !== own)
      throw new ForbiddenException("Chỉ được gửi giải trình cho chính mình.");
    return this.repository.create(parsed);
  }

  async update(id: string, patch: ExplanationPatch, actor: ActorContext) {
    const parsed = new SchemaPipe(updateSchema).transform(patch);
    const current = await this.owned(id, actor);
    if (current.status !== "PENDING")
      throw new ConflictException(
        "Chỉ sửa được đơn giải trình đang chờ duyệt.",
      );
    return this.repository.update(id, parsed);
  }

  async decide(id: string, input: DecisionInput, actor: ActorContext) {
    const parsed = new SchemaPipe(decisionSchema).transform(input);
    const current = await this.repository.get(id);
    if (current.status !== "PENDING")
      throw new ConflictException("Đơn giải trình đã được xử lý.");
    return this.repository.decide(id, parsed, actor.displayName);
  }

  async cancel(id: string, input: { version: number }, actor: ActorContext) {
    const parsed = new SchemaPipe(versionSchema).transform(input);
    const current = await this.owned(id, actor);
    if (current.status !== "PENDING")
      throw new ConflictException(
        "Chỉ hủy được đơn giải trình đang chờ duyệt.",
      );
    return this.repository.cancel(id, parsed.version);
  }
}
