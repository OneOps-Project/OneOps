import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { WorkPoliciesController } from "./work-policies.controller.js";
import { WorkPoliciesRepository } from "./work-policies.repository.js";
import { WorkPoliciesService } from "./work-policies.service.js";

@Module({
  imports: [DatabaseModule],
  exports: [WorkPoliciesService],
  controllers: [WorkPoliciesController],
  providers: [WorkPoliciesRepository, WorkPoliciesService],
})
export class WorkPoliciesModule {}
