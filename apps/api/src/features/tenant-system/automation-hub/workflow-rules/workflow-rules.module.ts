import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { WorkflowRulesController } from "./workflow-rules.controller.js";
import { WorkflowRulesRepository } from "./workflow-rules.repository.js";
import { WorkflowRulesService } from "./workflow-rules.service.js";

/**
 * Automation rules for the workflow bus. The bus itself lives in core, so this
 * feature owns the rules and never imports the domain it automates.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [WorkflowRulesController],
  providers: [WorkflowRulesRepository, WorkflowRulesService],
  exports: [WorkflowRulesService],
})
export class WorkflowRulesModule {}
