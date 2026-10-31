import { Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import {
  CurrentActor,
  RequirePermission,
  type ActorContext,
} from "../../../../core/auth/actor-context.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { listQuery } from "./dto/leave-approvals.dto.js";
import { LeaveApprovalsService } from "./leave-approvals.service.js";

const FEATURE = "hr-management/leaves/leave-approvals";

@Controller("leave-approvals")
export class LeaveApprovalsController {
  constructor(private readonly service: LeaveApprovalsService) {}

  @Get()
  @RequirePermission(FEATURE, "view")
  history(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.service.history(query, actor);
  }
}
