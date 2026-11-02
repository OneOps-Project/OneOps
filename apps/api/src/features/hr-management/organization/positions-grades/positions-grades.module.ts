import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { PositionsGradesRepository } from "./positions-grades.repository.js";
import { PositionsGradesService } from "./positions-grades.service.js";
import { PositionsGradesController } from "./positions-grades.controller.js";

@Module({
  imports: [DatabaseModule],
  exports: [PositionsGradesService],
  controllers: [PositionsGradesController],
  providers: [PositionsGradesRepository, PositionsGradesService],
})
export class PositionsGradesModule {}

