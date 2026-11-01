import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { TasksRepository } from "./tasks.repository.js";
import { TasksService } from "./tasks.service.js";
import { TasksController } from "./tasks.controller.js";
@Module({
  imports: [DatabaseModule],
  exports: [TasksService],
  controllers: [TasksController],
  providers: [TasksRepository, TasksService],
})
export class TasksModule {}
