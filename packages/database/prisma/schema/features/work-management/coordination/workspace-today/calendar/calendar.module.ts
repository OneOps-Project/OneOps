import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../../core/database/database.module.js";
import { CalendarRepository } from "./calendar.repository.js";
import { CalendarService } from "./calendar.service.js";
import { CalendarController } from "./calendar.controller.js";
@Module({
  imports: [DatabaseModule],
  exports: [CalendarService],
  controllers: [CalendarController],
  providers: [CalendarRepository, CalendarService],
})
export class CalendarModule {}
