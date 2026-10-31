import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import { RequirePermission } from "../../../../core/auth/actor-context.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  ruleInput,
  rulePatch,
  runsQuery,
  simulateInput,
  toggleInput,
  versionQuery,
} from "./dto/workflow-rules.dto.js";
import { WorkflowRulesService } from "./workflow-rules.service.js";

const FEATURE = "tenant-system/automation-hub/workflow-rules";

@Controller("automation")
export class WorkflowRulesController {
  constructor(private readonly service: WorkflowRulesService) {}

  @Get("rules")
  @RequirePermission(FEATURE, "view")
  rules() {
    return this.service.rules();
  }

  @Post("rules")
  @RequirePermission(FEATURE, "create")
  create(@Body(new SchemaPipe(ruleInput)) input: z.infer<typeof ruleInput>) {
    return this.service.create(input);
  }

  @Patch("rules/:id")
  @RequirePermission(FEATURE, "update")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(rulePatch)) input: z.infer<typeof rulePatch>,
  ) {
    return this.service.update(id, input);
  }

  @Patch("rules/:id/toggle")
  @HttpCode(200)
  @RequirePermission(FEATURE, "update")
  toggle(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(toggleInput)) input: z.infer<typeof toggleInput>,
  ) {
    return this.service.toggle(id, input.enabled, input.version);
  }

  @Delete("rules/:id")
  @RequirePermission(FEATURE, "delete")
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(versionQuery)) query: z.infer<typeof versionQuery>,
  ) {
    return this.service.remove(id, query.version);
  }

  @Post("simulate")
  @HttpCode(200)
  @RequirePermission(FEATURE, "view")
  simulate(
    @Body(new SchemaPipe(simulateInput)) input: z.infer<typeof simulateInput>,
  ) {
    return this.service.simulate(input);
  }

  @Get("runs")
  @RequirePermission(FEATURE, "view")
  runs(@Query(new SchemaPipe(runsQuery)) query: z.infer<typeof runsQuery>) {
    return this.service.runs(query);
  }
}
