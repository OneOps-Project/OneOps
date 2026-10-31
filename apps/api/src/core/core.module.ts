import { Global, Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module.js";
import { NotificationEvents } from "./events/notification-events.js";
import { WorkflowEvents } from "./events/workflow-events.js";
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [NotificationEvents, WorkflowEvents],
  exports: [DatabaseModule, NotificationEvents, WorkflowEvents],
})
export class CoreModule {}
