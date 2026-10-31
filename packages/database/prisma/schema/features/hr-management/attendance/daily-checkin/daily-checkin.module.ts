import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { DailyCheckinController } from "./daily-checkin.controller.js";
import { DailyCheckinRepository } from "./daily-checkin.repository.js";
import { DailyCheckinService } from "./daily-checkin.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [DailyCheckinController],
  providers: [DailyCheckinRepository, DailyCheckinService],
  exports: [DailyCheckinService],
})
export class DailyCheckinModule {}
