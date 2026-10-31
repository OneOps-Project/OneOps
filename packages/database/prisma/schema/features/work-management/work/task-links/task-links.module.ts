import { Module, type DynamicModule, type Type } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import {
  TASK_DIRECTORY,
  type TaskDirectoryPort,
} from "./task-directory.port.js";
import { TaskLinksController } from "./task-links.controller.js";
import { TaskLinksRepository } from "./task-links.repository.js";
import { TaskLinksService } from "./task-links.service.js";

/** The task read model is supplied by the main composition. */
@Module({})
export class TaskLinksModule {
  static forRoot(options: {
    tasks: Type<TaskDirectoryPort>;
    imports?: DynamicModule["imports"];
  }): DynamicModule {
    return {
      module: TaskLinksModule,
      imports: [DatabaseModule, ...(options.imports ?? [])],
      controllers: [TaskLinksController],
      providers: [
        TaskLinksRepository,
        TaskLinksService,
        { provide: TASK_DIRECTORY, useClass: options.tasks },
      ],
      exports: [TaskLinksService],
    };
  }
}
