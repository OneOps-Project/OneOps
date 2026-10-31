import { Module } from "@nestjs/common";
import { HrCapacityWorkloadController } from "./hr-management.capacity.controller.js";
import { HrCapacityWorkloadService } from "./hr-management.capacity.service.js";
import { ResourceCapacityModule } from "./employees/resource-capacity/index.js";
import { LeaveRequestsModule } from "./leaves/leave-requests/index.js";

@Module({
  imports: [ResourceCapacityModule, LeaveRequestsModule],
  controllers: [HrCapacityWorkloadController],
  providers: [HrCapacityWorkloadService],
})
export class HrCapacityWorkloadModule {}
