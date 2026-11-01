import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { KnowledgeSopRepository } from "./knowledge-sop.repository.js";
import { KnowledgeSopService } from "./knowledge-sop.service.js";
import { KnowledgeSopController } from "./knowledge-sop.controller.js";
@Module({
  imports: [DatabaseModule],
  controllers: [KnowledgeSopController],
  providers: [KnowledgeSopRepository, KnowledgeSopService],
})
export class KnowledgeSopModule {}
