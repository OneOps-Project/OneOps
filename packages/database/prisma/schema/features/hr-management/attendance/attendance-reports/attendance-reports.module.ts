import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { AttendanceReportsController } from "./attendance-reports.controller.js";
import { AttendanceReportsRepository } from "./attendance-reports.repository.js";
import { AttendanceReportsService } from "./attendance-reports.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AttendanceReportsController],
  providers: [AttendanceReportsRepository, AttendanceReportsService],
  exports: [AttendanceReportsService],
})
export class AttendanceReportsModule {}
