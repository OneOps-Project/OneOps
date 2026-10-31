import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { ResourceCapacityController } from "./resource-capacity.controller.js";
import { ResourceCapacityRepository } from "./resource-capacity.repository.js";
import { ResourceCapacityService } from "./resource-capacity.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [ResourceCapacityController],
  providers: [ResourceCapacityRepository, ResourceCapacityService],
  exports: [ResourceCapacityService],
})
export class ResourceCapacityModule {}
