import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { ProjectSpacesRepository } from "./project-spaces.repository.js";
import { ProjectSpacesService } from "./project-spaces.service.js";
import { ProjectSpacesController } from "./project-spaces.controller.js";
@Module({
  imports: [DatabaseModule],
  exports: [ProjectSpacesService],
  controllers: [ProjectSpacesController],
  providers: [ProjectSpacesRepository, ProjectSpacesService],
})
export class ProjectSpacesModule {}
