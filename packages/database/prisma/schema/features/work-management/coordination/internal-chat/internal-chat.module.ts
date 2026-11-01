import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { InternalChatRepository } from "./internal-chat.repository.js";
import { InternalChatService } from "./internal-chat.service.js";
import { InternalChatController } from "./internal-chat.controller.js";
@Module({
  imports: [DatabaseModule],
  controllers: [InternalChatController],
  providers: [InternalChatRepository, InternalChatService],
})
export class InternalChatModule {}
