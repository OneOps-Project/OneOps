import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { WorkforceBoardController } from "./workforce-board.controller.js";
import { WorkforceBoardRepository } from "./workforce-board.repository.js";
import { WorkforceBoardService } from "./workforce-board.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [WorkforceBoardController],
  providers: [WorkforceBoardRepository, WorkforceBoardService],
  exports: [WorkforceBoardService],
})
export class WorkforceBoardModule {}
