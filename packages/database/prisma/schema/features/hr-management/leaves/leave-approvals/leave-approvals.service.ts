import { Injectable } from "@nestjs/common";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import type { DecisionSnapshot, ListQuery } from "./dto/leave-approvals.dto.js";
import { LeaveApprovalsRepository } from "./leave-approvals.repository.js";

@Injectable()
export class LeaveApprovalsService {
  constructor(private readonly repository: LeaveApprovalsRepository) {}

  private ownOf(actor: ActorContext) {
    return actor.role === "EMPLOYEE" ? actor.employeeId : undefined;
  }

  history(query: ListQuery, actor: ActorContext) {
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

  record(input: DecisionSnapshot) {
    return this.repository.upsert(input);
  }
}
