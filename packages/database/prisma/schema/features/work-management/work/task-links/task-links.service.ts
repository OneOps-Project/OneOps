import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import { NotificationEvents } from "../../../../core/events/notification-events.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  blockerEntrySchema,
  linkInput,
  neighborhoodSchema,
} from "./dto/task-links.dto.js";
import type {
  BlockerEntry,
  LinkDto,
  LinkInput,
  LinkView,
  Neighborhood,
} from "./dto/task-links.dto.js";
import {
  TASK_DIRECTORY,
  type TaskDirectoryPort,
  type TaskRef,
} from "./task-directory.port.js";
import { TaskLinksRepository } from "./task-links.repository.js";

/** A closed blocker no longer holds anything back, so the gate ignores it. */
const CLOSED_STATUSES: readonly string[] = ["Hoàn thành", "Đã hủy"];

/** Deliberate ceilings: a task board never needs a denser graph than this. */
const MAX_LINKS_PER_TASK = 200;
const MAX_GRAPH_DEPTH = 12;
const MAX_GRAPH_NODES = 500;

const BLOCKS = "BLOCKS";

@Injectable()
export class TaskLinksService {
  constructor(
    private readonly repository: TaskLinksRepository,
    @Inject(TASK_DIRECTORY) private readonly directory: TaskDirectoryPort,
    @Optional() private readonly events?: NotificationEvents,
  ) {}

  /**
   * Creates a link after proving the pair exists, is not already linked and, for
   * `BLOCKS`, does not close a dependency cycle.
   */
  async link(rawInput: LinkInput, actor: ActorContext): Promise<LinkView> {
    const input = new SchemaPipe(linkInput).transform(rawInput);
    if (input.fromTaskId === input.toTaskId)
      throw new BadRequestException(
        "Không thể liên kết một công việc với chính nó.",
      );
    const from = await this.directory.get(input.fromTaskId);
    const to = await this.directory.get(input.toTaskId);
    await this.assertUnique(from.id, to.id, input.type);
    const total = await this.repository.countTouching(from.id);
    if (total >= MAX_LINKS_PER_TASK)
      throw new ConflictException(
        `Công việc ${from.code} đã có ${MAX_LINKS_PER_TASK} liên kết. Hãy dọn bớt trước khi thêm.`,
      );
    if (input.type === BLOCKS && (await this.reaches(to.id, from.id)))
      throw new ConflictException(
        `Liên kết bị từ chối: ${to.code} đang phụ thuộc vào ${from.code}, nên chiều ngược lại sẽ tạo vòng lặp.`,
      );

    const created = await this.repository.create({
      fromTaskId: from.id,
      toTaskId: to.id,
      type: input.type,
      note: input.note,
      createdById: actor.accountId,
      createdBy: actor.displayName,
    });
    if (input.type === BLOCKS) this.announce(created.id, from, to, actor);
    return withCounterpart(created, to);
  }

  async remove(id: string) {
    return this.repository.remove(id);
  }

  /** Both directions of a task's links, with the other end resolved. */
  async neighborhood(taskId: string): Promise<Neighborhood> {
    const task = await this.directory.get(taskId);
    const links = await this.repository.ofTask(taskId);
    const peers = [
      ...new Set(
        links
          .flatMap((link) => [link.fromTaskId, link.toTaskId])
          .filter((id) => id !== taskId),
      ),
    ];
    const refs = new Map(
      (await this.directory.find(peers)).map((ref) => [ref.id, ref]),
    );
    // A link whose other end disappeared is dropped instead of failing the page.
    const views = links.flatMap((link) => {
      const outgoing = link.fromTaskId === taskId;
      const counterpart = refs.get(outgoing ? link.toTaskId : link.fromTaskId);
      return counterpart
        ? [{ view: withCounterpart(link, counterpart), outgoing }]
        : [];
    });
    return neighborhoodSchema.parse({
      task,
      incoming: views.filter((item) => !item.outgoing).map((item) => item.view),
      outgoing: views.filter((item) => item.outgoing).map((item) => item.view),
    });
  }

  /** Board chips: how many open blockers each task carries. */
  async blockers(rawTaskIds: string): Promise<{ items: BlockerEntry[] }> {
    const ids = parseIds(rawTaskIds);
    const open = await this.openMap(ids);
    const incoming = await this.repository.blocksInto(ids);
    const total = new Map<string, number>();
    for (const link of incoming)
      total.set(link.toTaskId, (total.get(link.toTaskId) ?? 0) + 1);
    return {
      items: ids.map((taskId) =>
        blockerEntrySchema.parse({
          taskId,
          total: total.get(taskId) ?? 0,
          open: (open.get(taskId) ?? []).length,
          codes: (open.get(taskId) ?? []).slice(0, 5).map((ref) => ref.code),
        }),
      ),
    };
  }

  /** Gate read model for the workflow: open predecessors of one task. */
  async openBlockers(taskId: string): Promise<TaskRef[]> {
    return (await this.openMap([taskId])).get(taskId) ?? [];
  }

  /** Same as `openBlockers` for every id in one query. */
  async openBlockersMany(
    taskIds: readonly string[],
  ): Promise<Map<string, TaskRef[]>> {
    return this.openMap([...taskIds]);
  }

  private async openMap(taskIds: readonly string[]) {
    const result = new Map<string, TaskRef[]>();
    if (!taskIds.length) return result;
    const links = await this.repository.blocksInto(taskIds);
    const refs = new Map(
      (
        await this.directory.find([
          ...new Set(links.map((link) => link.fromTaskId)),
        ])
      ).map((ref) => [ref.id, ref]),
    );
    for (const link of links) {
      const blocker = refs.get(link.fromTaskId);
      if (!blocker || CLOSED_STATUSES.includes(blocker.status)) continue;
      const list = result.get(link.toTaskId) ?? [];
      list.push(blocker);
      result.set(link.toTaskId, list);
    }
    return result;
  }

  private async assertUnique(fromId: string, toId: string, type: string) {
    const existing = await this.repository.between(fromId, toId);
    if (!existing.length) return;
    const forward = existing.find((link) => link.fromTaskId === fromId);
    if (forward)
      throw new ConflictException(
        forward.type === type
          ? "Liên kết này đã tồn tại."
          : "Hai công việc đã có liên kết khác chiều này. Hãy xóa liên kết cũ trước.",
      );
    if (type !== BLOCKS && existing.some((link) => link.type === type))
      throw new ConflictException(
        "Hai công việc đã được liên kết theo chiều ngược lại.",
      );
  }

  /** Depth-limited search over `BLOCKS` edges: does `start` already depend on `goal`? */
  private async reaches(start: string, goal: string) {
    let frontier = [start];
    const seen = new Set(frontier);
    for (let depth = 0; depth < MAX_GRAPH_DEPTH && frontier.length; depth++) {
      const edges = await this.repository.blocksFrom(frontier);
      const next: string[] = [];
      for (const edge of edges) {
        if (edge.toTaskId === goal) return true;
        if (seen.has(edge.toTaskId)) continue;
        seen.add(edge.toTaskId);
        next.push(edge.toTaskId);
      }
      // A graph this dense is not a task board; refuse instead of guessing.
      if (seen.size > MAX_GRAPH_NODES) return true;
      frontier = next;
    }
    return false;
  }

  private announce(
    linkId: string,
    from: TaskRef,
    to: TaskRef,
    actor: ActorContext,
  ) {
    const assignee = to.assignee.trim();
    if (!this.events || !assignee) return;
    this.events.emit({
      source: "task",
      recipients: [assignee],
      title: `Công việc bị chặn: ${to.name}`.slice(0, 500),
      body: `${actor.displayName} đã đánh dấu ${from.code} là công việc chặn ${to.code}.`.slice(
        0,
        2000,
      ),
      link: `/work-management/tasks?focus=${to.id}`,
      sourceId: linkId,
    });
  }
}

/** Resolves the far end of a link without leaking the raw row shape. */
function withCounterpart(link: LinkDto, counterpart: TaskRef): LinkView {
  return { ...link, counterpart };
}

function parseIds(raw: string) {
  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ].slice(0, 200);
  for (const id of ids)
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new BadRequestException("Danh sách công việc không hợp lệ.");
  return ids;
}
