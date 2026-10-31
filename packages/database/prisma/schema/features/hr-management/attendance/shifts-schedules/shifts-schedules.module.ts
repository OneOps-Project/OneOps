import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { ShiftsSchedulesController } from "./shifts-schedules.controller.js";
import { ShiftsSchedulesRepository } from "./shifts-schedules.repository.js";
import { ShiftsSchedulesService } from "./shifts-schedules.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [ShiftsSchedulesController],
  providers: [ShiftsSchedulesRepository, ShiftsSchedulesService],
  exports: [ShiftsSchedulesService],
})
export class ShiftsSchedulesModule {}
