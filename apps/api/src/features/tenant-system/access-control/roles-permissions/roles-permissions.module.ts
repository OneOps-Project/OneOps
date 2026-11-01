import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { RolesPermissionsRepository } from "./roles-permissions.repository.js";
import { RolesPermissionsService } from "./roles-permissions.service.js";
@Module({
  imports: [DatabaseModule],
  providers: [RolesPermissionsRepository, RolesPermissionsService],
  exports: [RolesPermissionsService],
})
export class RolesPermissionsModule {}
