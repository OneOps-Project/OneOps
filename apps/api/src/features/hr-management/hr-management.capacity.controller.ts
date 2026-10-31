import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { RequirePermission } from "../../core/auth/actor-context.js";
import { HrCapacityWorkloadService } from "./hr-management.capacity.service.js";

const FEATURE = "hr-management/employees/resource-capacity";

@Controller("workload/capacity")
export class HrCapacityWorkloadController {
  constructor(private readonly service: HrCapacityWorkloadService) {}

  @Get(":periodId")
  @RequirePermission(FEATURE, "view")
  workload(@Param("periodId", new ParseUUIDPipe()) periodId: string) {
    return this.service.workload(periodId);
  }
}
