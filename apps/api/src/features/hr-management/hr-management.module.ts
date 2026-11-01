import { Module } from "@nestjs/common";
import { EmployeeDirectoryModule } from "./employees/employee-directory/index.js";
@Module({
  imports: [EmployeeDirectoryModule],
  exports: [EmployeeDirectoryModule],
})
export class HrManagementModule {}
