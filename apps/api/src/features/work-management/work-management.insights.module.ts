import { Module, Injectable, Controller, Get } from "@nestjs/common";
import { TasksModule, TasksService } from "./work/tasks/index.js";
import { ProjectSpacesService } from "./projects/project-spaces/index.js";
import { projectSpacesModule } from "./work-management.composition.js";
import {
  TicketsApprovalsModule,
  TicketsApprovalsService,
} from "./coordination/tickets-approvals/index.js";
import {
  CalendarModule,
  CalendarService,
} from "./coordination/workspace-today/calendar/index.js";
@Injectable()
class WorkspaceInsightsService {
  constructor(
    private readonly tasks: TasksService,
    private readonly projects: ProjectSpacesService,
    private readonly requests: TicketsApprovalsService,
    private readonly calendar: CalendarService,
  ) {}
  async summary() {
    // Fetch every task page; counts must remain correct after the first 100 items.
    const first = await this.tasks.list({ page: 1, pageSize: 100 });
    const tasks = [...first.items];
    for (let page = 2; tasks.length < first.total; page++) {
      const next = await this.tasks.list({ page, pageSize: 100 });
      tasks.push(...next.items);
      if (!next.items.length) break;
    }
    const [projects, requests, calendar] = await Promise.all([
      this.projects.list({ page: 1, pageSize: 1 }),
      this.requests.list({ page: 1, pageSize: 1, status: "Chờ duyệt" }),
      this.calendar.list({ page: 1, pageSize: 100 }),
    ]);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    let todayEvents = calendar.items.filter(
      (event) => event.date === today && event.status !== "Đã hủy",
    ).length;
    for (let page = 2; page <= Math.ceil(calendar.total / 100); page++) {
      const next = await this.calendar.list({ page, pageSize: 100 });
      todayEvents += next.items.filter(
        (event) => event.date === today && event.status !== "Đã hủy",
      ).length;
    }
    const completed = tasks.filter(
      (task) => task.status === "Hoàn thành",
    ).length;
    // BR-ST-08/BR-ST-11: cancelled work leaves the denominator and only the
    // actionable statuses can be late.
    const scoped =
      first.total - tasks.filter((task) => task.status === "Đã hủy").length;
    return {
      totalTasks: first.total,
      completedTasks: completed,
      overdueTasks: tasks.filter(
        (task) =>
          ["Cần làm", "Đang làm", "Làm lại"].includes(task.status) &&
          task.date < today,
      ).length,
      projects: projects.total,
      pendingRequests: requests.total,
      todayEvents,
      completionRate: scoped ? Math.round((completed / scoped) * 100) : 0,
      tasks: tasks
        .filter(
          (task) => task.status !== "Hoàn thành" && task.status !== "Đã hủy",
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8)
        .map(({ id, name, status, date, assignee }) => ({
          id,
          name,
          status,
          date,
          assignee,
        })),
      updatedAt: new Date().toISOString(),
    };
  }
}
@Controller("workspace")
class WorkspaceInsightsController {
  constructor(private readonly service: WorkspaceInsightsService) {}
  @Get("summary") summary() {
    return this.service.summary();
  }
}
@Module({
  imports: [
    TasksModule,
    projectSpacesModule,
    TicketsApprovalsModule,
    CalendarModule,
  ],
  providers: [WorkspaceInsightsService],
  controllers: [WorkspaceInsightsController],
})
export class WorkspaceInsightsModule {}
