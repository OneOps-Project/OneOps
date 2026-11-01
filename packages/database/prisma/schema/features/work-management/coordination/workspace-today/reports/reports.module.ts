import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../../core/database/database.module.js";
import { ReportsRepository } from "./reports.repository.js";
import { ReportsService } from "./reports.service.js";
import { ReportsController } from "./reports.controller.js";
@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [ReportsRepository, ReportsService],
})
export class ReportsModule {}
