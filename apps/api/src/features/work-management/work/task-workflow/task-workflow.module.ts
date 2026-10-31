import { Module, type DynamicModule, type Type } from "@nestjs/common";
import { DatabaseModule } from "../../../../core/database/database.module.js";
import { TASK_BLOCKERS, type TaskBlockersPort } from "./blocker.port.js";
import {
  TASK_COMMENT_SINK,
  type TaskCommentSinkPort,
} from "./comment-sink.port.js";
import { QA_GATE, type QaGatePort } from "./qa-gate.port.js";
import { TASK_STATE, type TaskStatePort } from "./task-state.port.js";
import { TaskWorkflowController } from "./task-workflow.controller.js";
import { TaskWorkflowRepository } from "./task-workflow.repository.js";
import { TaskWorkflowService } from "./task-workflow.service.js";

/**
 * The task aggregate, the comment sink, the QA precondition and the dependency
 * graph are supplied by the main composition, so this feature never imports
 * another feature.
 */
@Module({})
export class TaskWorkflowModule {
  static forRoot(options: {
    tasks: Type<TaskStatePort>;
    comments?: Type<TaskCommentSinkPort>;
    qa?: Type<QaGatePort>;
    blockers?: Type<TaskBlockersPort>;
    imports?: DynamicModule["imports"];
  }): DynamicModule {
    return {
      module: TaskWorkflowModule,
      imports: [DatabaseModule, ...(options.imports ?? [])],
      controllers: [TaskWorkflowController],
      providers: [
        TaskWorkflowRepository,
        TaskWorkflowService,
        { provide: TASK_STATE, useClass: options.tasks },
        ...(options.comments
          ? [{ provide: TASK_COMMENT_SINK, useClass: options.comments }]
          : []),
        ...(options.qa ? [{ provide: QA_GATE, useClass: options.qa }] : []),
        ...(options.blockers
          ? [{ provide: TASK_BLOCKERS, useClass: options.blockers }]
          : []),
      ],
      exports: [TaskWorkflowService],
    };
  }
}
