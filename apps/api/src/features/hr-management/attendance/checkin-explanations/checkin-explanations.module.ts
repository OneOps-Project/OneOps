import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { CheckinExplanationsController } from "./checkin-explanations.controller.js";
import { CheckinExplanationsRepository } from "./checkin-explanations.repository.js";
import { CheckinExplanationsService } from "./checkin-explanations.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [CheckinExplanationsController],
  providers: [CheckinExplanationsRepository, CheckinExplanationsService],
  exports: [CheckinExplanationsService],
})
export class CheckinExplanationsModule {}
