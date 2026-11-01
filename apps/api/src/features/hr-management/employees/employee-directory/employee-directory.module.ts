import {
  EmployeeDirectoryController,
  EmployeeDirectoryGuard,
} from "./employee-directory.controller.js";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { EmployeeDirectoryRepository } from "./employee-directory.repository.js";
import { EmployeeDirectoryService } from "./employee-directory.service.js";
@Module({
  controllers: [EmployeeDirectoryController],
  imports: [DatabaseModule],
  providers: [
    EmployeeDirectoryGuard,
    EmployeeDirectoryRepository,
    EmployeeDirectoryService,
  ],
  exports: [EmployeeDirectoryService],
})
export class EmployeeDirectoryModule {}
