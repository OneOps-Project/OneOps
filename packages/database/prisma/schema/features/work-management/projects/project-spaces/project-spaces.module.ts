import { Module, type DynamicModule, type Type } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { ProjectSpacesController } from "./project-spaces.controller.js";
import { ProjectSpacesRepository } from "./project-spaces.repository.js";
import { ProjectSpacesService } from "./project-spaces.service.js";
import { SprintController } from "./sprint.controller.js";
import { SprintRepository } from "./sprint.repository.js";
import { SprintService } from "./sprint.service.js";
import { SPRINT_TASKS, type SprintTaskPort } from "./sprint-task.port.js";

/**
 * The task read model comes from the main composition, so the sprint board
 * never imports the tasks feature and keeps owning only its own tables.
 */
@Module({})
export class ProjectSpacesModule {
  static forRoot(options: {
    tasks: Type<SprintTaskPort>;
    imports?: DynamicModule["imports"];
  }): DynamicModule {
    return {
      module: ProjectSpacesModule,
      imports: [DatabaseModule, ...(options.imports ?? [])],
      controllers: [ProjectSpacesController, SprintController],
      providers: [
        ProjectSpacesRepository,
        ProjectSpacesService,
        SprintRepository,
        SprintService,
        { provide: SPRINT_TASKS, useClass: options.tasks },
      ],
      exports: [ProjectSpacesService, SprintService],
    };
  }
}
