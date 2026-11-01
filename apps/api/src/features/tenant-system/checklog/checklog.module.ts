import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../core/database/database.module.js";
import { ChecklogRepository } from "./checklog.repository.js";
import { ChecklogService } from "./checklog.service.js";
import { ChecklogController } from "./checklog.controller.js";
import { ChecklogGuard } from "./guards/checklog.guard.js";
@Module({
  imports: [DatabaseModule],
  providers: [ChecklogRepository, ChecklogService, ChecklogGuard],
  controllers: [ChecklogController],
  exports: [ChecklogService],
})
export class ChecklogModule {}
