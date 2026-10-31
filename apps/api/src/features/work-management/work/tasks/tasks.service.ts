import {
  validatedCreateSchema as createSchema,
  updateSchema,
} from "./dto/tasks.dto.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { Injectable } from "@nestjs/common";
import { TasksRepository } from "./tasks.repository.js";
import {
  NotificationEvents,
  parseRecipients,
} from "../../../../core/events/notification-events.js";
import {
  WorkflowEvents,
  type WorkflowField,
} from "../../../../core/events/workflow-events.js";
import type { RecordInput, TaskStatus } from "./dto/tasks.dto.js";
import type { Transaction } from "../../../../core/database/database.module.js";
import type { ListQuery } from "./dto/tasks.dto.js";

/** What the automation engine needs to know about a task, and nothing more. */
interface TaskRow {
  id: string;
  code: string;
  name: string;
  status: string;
  scope: string;
  date: string;
  assignee: string;
  reviewer: string;
}

const WORKFLOW_FIELDS: readonly WorkflowField[] = [
  "status",
  "assignee",
  "reviewer",
  "scope",
  "code",
  "name",
  "date",
];

@Injectable()
export class TasksService {
  constructor(
    private readonly repository: TasksRepository,
    private readonly events: NotificationEvents,
    private readonly workflow: WorkflowEvents,
  ) {}

  /** Publishes the snapshot the automation engine evaluates. */
  private publish(task: TaskRow, previous?: TaskRow) {
    this.workflow.emitTrigger({
      entity: "task",
      id: task.id,
      code: task.code,
      name: task.name,
      status: task.status,
      assignee: task.assignee,
      reviewer: task.reviewer,
      scope: task.scope,
      date: task.date,
      ...(previous
        ? {
            previous: Object.fromEntries(
              WORKFLOW_FIELDS.filter(
                (field) => task[field] !== previous[field],
              ).map((field) => [field, previous[field]]),
            ),
          }
        : {}),
    });
  }

  list(query: ListQuery) {
    return this.repository.list(query);
  }

  get(id: string, tx?: Transaction) {
    return this.repository.get(id, tx);
  }

  async create(input: RecordInput, tx?: Transaction) {
    const created = await this.repository.create(
      new SchemaPipe(createSchema).transform(input),
      tx,
    );
    if (created.assignee)
      this.events.emit({
        source: "task",
        recipients: [created.assignee],
        title: `Công việc mới: ${created.name}`.slice(0, 500),
        body: `Bạn được giao công việc ${created.code}.`,
        link: `/work-management/tasks?focus=${created.id}`,
        sourceId: created.id,
      });
    if (created.reviewer && created.reviewer !== created.assignee)
      this.events.emit({
        source: "task",
        recipients: [created.reviewer],
        title: `Nhiệm vụ kiểm tra mới: ${created.name}`.slice(0, 500),
        body: `Bạn được chỉ định làm Người kiểm tra cho công việc ${created.code}.`,
        link: `/work-management/tasks?focus=${created.id}`,
        sourceId: created.id,
      });
    this.publish(created);
    return created;
  }

  async update(
    id: string,
    input: Partial<RecordInput> & { version: number },
    tx?: Transaction,
  ) {
    const patch = new SchemaPipe(updateSchema).transform(input);
    const current = await this.repository.get(id, tx);
    new SchemaPipe(createSchema).transform({
      code: current.code,
      name: current.name,
      date: current.date,
      scope: current.scope,
      assignee: current.assignee,
      reviewer: current.reviewer,
      note: current.note,
      fields: current.fields,
      ...Object.fromEntries(
        Object.entries(patch).filter(([key]) => key !== "version"),
      ),
    });
    const updated = await this.repository.update(id, patch, tx);
    const link = `/work-management/tasks?focus=${updated.id}`;

    // Giao lại task: assignee thay đổi
    if (updated.assignee && updated.assignee !== current.assignee)
      this.events.emit({
        source: "task",
        recipients: [updated.assignee],
        title: `Công việc được giao: ${updated.name}`.slice(0, 500),
        body: `Bạn được giao công việc ${updated.code}.`,
        link,
        sourceId: updated.id,
      });

    // Người kiểm tra thay đổi
    if (updated.reviewer && updated.reviewer !== current.reviewer)
      this.events.emit({
        source: "task",
        recipients: [updated.reviewer],
        title: `Nhiệm vụ kiểm tra mới: ${updated.name}`.slice(0, 500),
        body: `Bạn được chỉ định làm Người kiểm tra cho công việc ${updated.code}.`,
        link,
        sourceId: updated.id,
      });

    // Deadline thay đổi
    if (updated.date !== current.date) {
      this.events.emit({
        source: "task",
        recipients: parseRecipients(
          updated.assignee,
          ...(updated.reviewer ? [updated.reviewer] : []),
        ),
        title: `Deadline đã thay đổi: ${updated.name}`.slice(0, 500),
        body: `Hạn hoàn thành của công việc ${updated.code} đã được cập nhật.`,
        link,
        sourceId: updated.id,
      });
    }

    this.publish(updated, current);
    return updated;
  }

  /** Reserved for the workflow composition; the HTTP contract never accepts a status. */
  async applyStatus(id: string, status: TaskStatus, version: number) {
    const current = await this.repository.get(id);
    const updated = await this.repository.applyStatus(id, status, version);
    this.publish(updated, current);
    return updated;
  }

  async setDeadline(id: string, date: string, version: number) {
    const current = await this.repository.get(id);
    const updated = await this.repository.setDeadline(id, date, version);
    this.publish(updated, current);
    this.events.emit({
      source: "task",
      recipients: parseRecipients(
        updated.assignee,
        ...(updated.reviewer ? [updated.reviewer] : []),
      ),
      title: `Deadline đã thay đổi: ${updated.name}`.slice(0, 500),
      body: `Hạn hoàn thành của công việc ${updated.code} đã được cập nhật.`,
      link: `/work-management/tasks?focus=${updated.id}`,
      sourceId: updated.id,
    });
    return updated;
  }

  async remove(id: string, version: number, tx?: Transaction) {
    const result = await this.repository.remove(id, version, tx);
    this.events.emitDeletion({ sourceId: id });
    return result;
  }
}
