import { Module } from "@nestjs/common";
import { DepartmentsTeamsModule } from "./organization/departments-teams/index.js";

@Module({
  imports: [DepartmentsTeamsModule],
  exports: [DepartmentsTeamsModule],
})
export class HrManagementModule {}
