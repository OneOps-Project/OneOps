import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import { RequirePermission } from "../../../../core/auth/actor-context.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  createHolidaySchema,
  createNetworkSchema,
  createQuotaSchema,
  listQuery,
  updateHolidaySchema,
  updateNetworkSchema,
  updatePolicySchema,
  updateQuotaSchema,
} from "./dto/work-policies.dto.js";
import { WorkPoliciesService } from "./work-policies.service.js";

const FEATURE = "tenant-system/organization/work-policies";

@Controller("work-policies")
export class WorkPoliciesController {
  constructor(private readonly service: WorkPoliciesService) {}
  @Get()
  @RequirePermission(FEATURE, "view")
  read() {
    return this.service.read();
  }
  @Put()
  @HttpCode(200)
  @RequirePermission(FEATURE, "update")
  update(
    @Body(new SchemaPipe(updatePolicySchema))
    input: z.infer<typeof updatePolicySchema>,
  ) {
    return this.service.update(input);
  }
  @Get("holidays")
  @RequirePermission(FEATURE, "view")
  listHolidays(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.service.listHolidays(query);
  }
  @Post("holidays")
  @RequirePermission(FEATURE, "create")
  createHoliday(
    @Body(new SchemaPipe(createHolidaySchema))
    input: z.infer<typeof createHolidaySchema>,
  ) {
    return this.service.createHoliday(input);
  }
  @Patch("holidays/:id")
  @RequirePermission(FEATURE, "update")
  updateHoliday(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateHolidaySchema))
    input: z.infer<typeof updateHolidaySchema>,
  ) {
    return this.service.updateHoliday(id, input);
  }
  @Get("networks")
  @RequirePermission(FEATURE, "view")
  listNetworks(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.service.listNetworks(query);
  }
  @Post("networks")
  @RequirePermission(FEATURE, "create")
  createNetwork(
    @Body(new SchemaPipe(createNetworkSchema))
    input: z.infer<typeof createNetworkSchema>,
  ) {
    return this.service.createNetwork(input);
  }
  @Patch("networks/:id")
  @RequirePermission(FEATURE, "update")
  updateNetwork(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateNetworkSchema))
    input: z.infer<typeof updateNetworkSchema>,
  ) {
    return this.service.updateNetwork(id, input);
  }
  @Get("quotas")
  @RequirePermission(FEATURE, "view")
  listQuotas(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.service.listQuotas(query);
  }
  @Post("quotas")
  @RequirePermission(FEATURE, "create")
  createQuota(
    @Body(new SchemaPipe(createQuotaSchema))
    input: z.infer<typeof createQuotaSchema>,
  ) {
    return this.service.createQuota(input);
  }
  @Patch("quotas/:id")
  @RequirePermission(FEATURE, "update")
  updateQuota(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateQuotaSchema))
    input: z.infer<typeof updateQuotaSchema>,
  ) {
    return this.service.updateQuota(id, input);
  }
}
