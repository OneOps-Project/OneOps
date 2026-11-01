import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Headers,
} from "@nestjs/common";
import { z } from "zod";
import {
  validatedCreateSchema as createSchema,
  updateSchema,
  changeStatusSchema,
  reassignSchema,
} from "./dto/tasks.dto.js";
import { listQuery, versionSchema } from "./dto/tasks.dto.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { TasksService } from "./tasks.service.js";

@Controller("tasks")
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  list(@Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.service.list(query);
  }

  @Post()
  create(
    @Body(new SchemaPipe(createSchema)) input: z.infer<typeof createSchema>,
  ) {
    return this.service.create(input);
  }

  @Get("my-tasks")
  getMyTasks(@Headers("x-user-id") userId: string) {
    // Tạm dùng header x-user-id, sau này thay bằng auth
    if (!userId) {
      return { error: "Missing x-user-id header" };
    }
    return this.service.getMyTasks(userId);
  }

  @Get("flagged")
  getFlaggedTasks() {
    return this.service.getFlaggedTasks();
  }

  @Get("completion-rate")
  getCompletionRate(@Query("scope") scope?: string) {
    return this.service.getCompletionRate(scope);
  }

  @Get("employee-stats/:employeeId")
  getEmployeeStats(@Param("employeeId") employeeId: string) {
    return this.service.getEmployeeTaskStats(employeeId);
  }

  @Get("check-similar")
  checkSimilarTasks(
    @Query("assignee") assignee: string,
    @Query("name") name: string,
  ) {
    return this.service.checkSimilarTasks(assignee, name);
  }

  @Get(":id")
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.get(id);
  }

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateSchema)) input: z.infer<typeof updateSchema>,
  ) {
    return this.service.update(id, input);
  }

  @Post(":id/change-status")
  changeStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(changeStatusSchema))
    input: z.infer<typeof changeStatusSchema>,
  ) {
    return this.service.changeStatus(id, input);
  }

  @Post(":id/reassign")
  reassign(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(reassignSchema)) input: z.infer<typeof reassignSchema>,
  ) {
    return this.service.reassignTask(id, input);
  }

  @Delete(":id")
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(versionSchema)) input: z.infer<typeof versionSchema>,
  ) {
    return this.service.remove(id, input.version);
  }
}
