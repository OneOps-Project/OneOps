import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { WorkspaceTodayRepository } from "./workspace-today.repository.js";
import { WorkspaceTodayService } from "./workspace-today.service.js";
import { WorkspaceTodayController } from "./workspace-today.controller.js";
@Module({
  imports: [DatabaseModule],
  controllers: [WorkspaceTodayController],
  providers: [WorkspaceTodayRepository, WorkspaceTodayService],
})
export class WorkspaceTodayModule {}
