import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import { NotificationEvents } from "../../../../core/events/notification-events.js";
import {
  TASK_BLOCKERS,
  type BlockerRef,
  type TaskBlockersPort,
} from "./blocker.port.js";
import {
  TASK_COMMENT_SINK,
  type TaskCommentSinkPort,
} from "./comment-sink.port.js";
import { QA_GATE, type QaGatePort } from "./qa-gate.port.js";
import { TaskWorkflowRepository } from "./task-workflow.repository.js";
import {
  TASK_STATE,
  type TaskStatePort,
  type TaskStateSnapshot,
} from "./task-state.port.js";
import {
  allowedEntrySchema,
  decisionInput,
  idempotencyKey,
  proposalInput,
  taskStateSchema,
  transitionInput,
} from "./dto/task-workflow.dto.js";
import type {
  AllowedEntry,
  AllowedMove,
  DecisionInput,
  ProposalDto,
  ProposalInput,
  ProposalQuery,
  TaskStateDto,
  TransitionInput,
} from "./dto/task-workflow.dto.js";
import {
  HOLD_STATUS,
  RESTORE_STATUSES,
  TASK_STATUSES,
  TRANSITIONS,
  deadlinePassed,
  isTerminal,
  matchesActor,
  rulesFrom,
  type ActorKind,
  type TaskStatus,
  type TransitionRule,
} from "./state-machine.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";

const TERMINAL_MESSAGE =
  "Công việc đã ở trạng thái kết thúc và không thể chuyển tiếp.";
const PENDING_MESSAGE =
  "Công việc đã có một đề xuất đang chờ duyệt. Vui lòng chờ Quản lý xử lý.";
/** Entering this status waits on the dependency graph. */
const START_STATUS = "Đang làm";

/** A move before the dependency gate is applied. */
type Move = Pick<AllowedMove, "code" | "to">;

@Injectable()
export class TaskWorkflowService {
  constructor(
    private readonly repository: TaskWorkflowRepository,
    @Inject(TASK_STATE) private readonly tasks: TaskStatePort,
    @Optional()
    @Inject(TASK_COMMENT_SINK)
    private readonly comments?: TaskCommentSinkPort,
    @Optional()
    @Inject(QA_GATE)
    private readonly qa?: QaGatePort,
    @Optional()
    @Inject(TASK_BLOCKERS)
    private readonly blockers?: TaskBlockersPort,
    @Optional() private readonly events?: NotificationEvents,
  ) {}

  /** Static contract used by clients and documentation. */
  rules() {
    return {
      statuses: [...TASK_STATUSES],
      terminal: ["Hoàn thành", "Đã hủy"],
      transitions: TRANSITIONS.map((rule) => ({
        code: rule.code,
        from: [...rule.from],
        to: rule.to,
        actor: rule.actor,
        reasonRequired: rule.reasonRequired,
      })),
    };
  }

  async state(taskId: string, actor: ActorContext): Promise<TaskStateDto> {
    const task = await this.tasks.get(taskId);
    const history = await this.repository.history(taskId);
    const pending = await this.repository.pendingProposal(taskId);
    const restoreStatus = this.restoreStatus(history);
    const open = await this.openBlockers([taskId]);
    return taskStateSchema.parse({
      task,
      allowed: this.decorate(
        this.allowedMoves(task, restoreStatus, actor),
        open.get(taskId)?.length ?? 0,
      ),
      pendingProposal: pending,
      restoreStatus,
      history,
    });
  }

  async allowed(
    rawTaskIds: string,
    actor: ActorContext,
  ): Promise<{ items: AllowedEntry[] }> {
    const ids = [
      ...new Set(
        rawTaskIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ].slice(0, 200);
    for (const id of ids)
      if (!/^[0-9a-f-]{36}$/i.test(id))
        throw new BadRequestException("Danh sách công việc không hợp lệ.");
    const snapshots = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.tasks.get(id);
        } catch {
          return null;
        }
      }),
    );
    const known = snapshots.filter(
      (task): task is TaskStateSnapshot => task !== null,
    );
    const pending = await this.repository.pendingProposals(
      known.map((task) => task.id),
    );
    const holds = await this.repository.latestHolds(
      known.map((task) => task.id),
    );
    const pendingByTask = new Map(pending.map((item) => [item.taskId, item]));
    const open = await this.openBlockers(known.map((task) => task.id));
    return {
      items: known.map((task) => {
        const restoreStatus = holds.get(task.id) ?? null;
        return allowedEntrySchema.parse({
          taskId: task.id,
          status: task.status,
          allowed: this.decorate(
            this.allowedMoves(task, restoreStatus, actor),
            open.get(task.id)?.length ?? 0,
          ),
          pendingProposal: pendingByTask.get(task.id) ?? null,
          restoreStatus,
        });
      }),
    };
  }

  async history(taskId: string) {
    await this.tasks.get(taskId);
    return { items: await this.repository.history(taskId) };
  }

  async proposals(query: ProposalQuery) {
    return this.repository.listProposals(query);
  }

  async transition(
    taskId: string,
    rawInput: TransitionInput,
    actor: ActorContext,
    rawKey?: string,
    decidedProposalId?: string,
  ): Promise<TaskStateDto> {
    const input = new SchemaPipe(transitionInput).transform(rawInput);
    const key = this.requestKey(rawKey);
    if (key) {
      const replay = await this.repository.transitionByKey(taskId, key);
      if (replay) return this.state(taskId, actor);
    }
    const task = await this.tasks.get(taskId);
    if (isTerminal(task.status)) throw new ConflictException(TERMINAL_MESSAGE);
    const history = await this.repository.history(taskId);
    const restoreStatus = this.restoreStatus(history);
    const rule = this.matchRule(task.status, input.toStatus, restoreStatus);
    if (!rule)
      throw new ConflictException(
        `Không thể chuyển từ “${task.status}” sang “${input.toStatus}”.`,
      );
    this.authorize(rule.actor, task, actor);
    const reason = input.reason?.trim() ?? "";
    const overrideReason = input.overrideReason?.trim() ?? "";
    if (rule.reasonRequired && !reason)
      throw new UnprocessableEntityException(
        "Thao tác này bắt buộc nhập lý do.",
      );
    if (rule.code === "TR-05" && deadlinePassed(task.date))
      throw new UnprocessableEntityException(
        "Deadline đã qua. Quản lý cần đặt Deadline mới trước khi chuyển Làm lại.",
      );
    if (rule.code === "TR-07") this.assertResumeAllowed(task, input.toStatus);
    const startOverride = await this.assertStartAllowed(
      rule,
      task,
      input.toStatus,
      actor,
      overrideReason,
    );
    const override =
      startOverride ||
      (await this.assertCompletionAllowed(rule, task, actor, overrideReason));
    // Bypassing the QA gate is a reason of its own, so it keeps the same trail.
    const recorded = override ? overrideReason : reason;

    const updated = await this.tasks.transition(taskId, {
      toStatus: input.toStatus,
      version: input.version,
    });
    await this.repository.transaction(async (tx) => {
      await this.repository.lockTask(taskId, tx);
      await this.repository.recordTransition(
        {
          taskId,
          fromStatus: task.status,
          toStatus: updated.status,
          code: rule.code,
          reason: recorded,
          actorAccountId: actor.accountId,
          actorName: actor.displayName,
          actorRole: actor.role,
          taskVersion: updated.version,
          requestKey: key,
        },
        tx,
      );
      const closed = await this.repository.closePending(
        taskId,
        actor.displayName,
        "Tự động đóng vì công việc đã đổi trạng thái.",
        tx,
        // The proposal that triggered this move is decided by its own endpoint.
        decidedProposalId,
      );
      for (const proposal of closed)
        this.notify(
          task,
          proposal.requestedByName,
          `Đề xuất đã tự đóng: ${task.name}`,
          `Đề xuất ${this.kindLabel(proposal.kind)} của bạn tự đóng vì công việc ${task.code} đã đổi trạng thái.`,
        );
    });
    if (recorded && (rule.reasonRequired || override))
      await this.recordReason(taskId, actor.displayName, recorded, rule.code);
    this.announce(task, rule, actor, override, updated.status);
    return this.state(taskId, actor);
  }

  async propose(
    taskId: string,
    rawInput: ProposalInput,
    actor: ActorContext,
    rawKey?: string,
  ): Promise<ProposalDto> {
    const input = new SchemaPipe(proposalInput).transform(rawInput);
    const key = this.requestKey(rawKey);
    if (key) {
      const replay = await this.repository.proposalByKey(taskId, key);
      if (replay) return replay;
    }
    const task = await this.tasks.get(taskId);
    if (isTerminal(task.status)) throw new ConflictException(TERMINAL_MESSAGE);
    if (
      input.kind !== "DEADLINE" &&
      !RESTORE_STATUSES.includes(task.status as TaskStatus)
    )
      throw new ConflictException(
        `Không thể đề xuất ${this.kindLabel(input.kind)} cho công việc ở trạng thái “${task.status}”.`,
      );
    if (input.kind === "DEADLINE" && !this.isAssignee(task, actor))
      throw new ForbiddenException(
        "Chỉ người phụ trách được đề xuất Deadline mới.",
      );
    if (input.kind !== "DEADLINE" && !this.isAssignee(task, actor))
      throw new ForbiddenException(
        "Chỉ người phụ trách được gửi đề xuất hoãn hoặc hủy.",
      );

    const proposal = await this.repository.transaction(async (tx) => {
      await this.repository.lockTask(taskId, tx);
      if (key) {
        const replay = await this.repository.proposalByKey(taskId, key, tx);
        if (replay) return replay;
      }
      const pending = await this.repository.pendingProposal(taskId, tx);
      if (pending) throw new ConflictException(PENDING_MESSAGE);
      return this.repository.createProposal(
        {
          taskId,
          kind: input.kind,
          status: "PENDING",
          reason: input.reason,
          payload: input.newDate ? { newDate: input.newDate } : {},
          requestedByAccountId: actor.accountId,
          requestedByName: actor.displayName,
          requestKey: key,
        },
        tx,
      );
    });
    this.notify(
      task,
      this.managerRecipients(task),
      `Đề xuất ${this.kindLabel(proposal.kind)}: ${task.name}`,
      `${actor.displayName} đề xuất ${this.kindLabel(proposal.kind)} cho công việc ${task.code}: ${proposal.reason}`,
    );
    return proposal;
  }

  async decide(
    proposalId: string,
    rawInput: DecisionInput,
    actor: ActorContext,
  ): Promise<ProposalDto> {
    const input = new SchemaPipe(decisionInput).transform(rawInput);
    if (actor.role !== "MANAGER" && !actor.isSystemAdmin)
      throw new ForbiddenException("Chỉ Quản lý được xử lý đề xuất.");
    const proposal = await this.repository.getProposal(proposalId);
    if (proposal.status !== "PENDING")
      throw new ConflictException("Đề xuất đã được xử lý trước đó.");
    if (proposal.requestedByName === actor.displayName)
      throw new ForbiddenException("Không tự duyệt đề xuất của chính mình.");
    const task = await this.tasks.get(proposal.taskId);

    if (input.decision === "APPROVE") {
      if (proposal.kind === "DEADLINE") {
        const date = String(proposal.payload.newDate ?? "");
        if (!date)
          throw new UnprocessableEntityException(
            "Đề xuất Deadline thiếu ngày mới.",
          );
        await this.tasks.setDeadline(task.id, {
          date,
          version: task.version,
        });
      } else {
        await this.transition(
          task.id,
          {
            toStatus: proposal.kind === "HOLD" ? HOLD_STATUS : "Đã hủy",
            version: task.version,
            reason: proposal.reason,
          },
          actor,
          undefined,
          // Keeps this proposal pending until its decision is recorded below.
          proposal.id,
        );
      }
    }

    const decided = await this.repository.decideProposal(proposal.id, {
      version: proposal.version,
      status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
      decidedByAccountId: actor.accountId,
      decidedByName: actor.displayName,
      decisionReason: input.reason?.trim() ?? "",
    });
    if (input.decision === "REJECT")
      await this.recordReason(
        task.id,
        actor.displayName,
        `Từ chối đề xuất ${this.kindLabel(proposal.kind)}: ${decided.decisionReason}`,
        "PROPOSAL_REJECTED",
      );
    this.notify(
      task,
      proposal.requestedByName,
      `Kết quả đề xuất ${this.kindLabel(proposal.kind)}: ${task.name}`,
      input.decision === "APPROVE"
        ? `Quản lý đã chấp thuận đề xuất của bạn cho công việc ${task.code}.`
        : `Quản lý từ chối đề xuất của bạn cho công việc ${task.code}: ${decided.decisionReason}`,
    );
    return decided;
  }

  private allowedMoves(
    task: TaskStateSnapshot,
    restoreStatus: string | null,
    actor: ActorContext,
  ): Move[] {
    if (isTerminal(task.status)) return [];
    return rulesFrom(task.status).flatMap((rule) => {
      if (!this.mayAct(rule, task, actor)) return [];
      if (rule.to === "RESTORE")
        return restoreStatus ? [{ code: rule.code, to: restoreStatus }] : [];
      return [{ code: rule.code, to: rule.to }];
    });
  }

  private matchRule(
    from: string,
    to: string,
    restoreStatus: string | null,
  ): TransitionRule | undefined {
    return TRANSITIONS.find(
      (rule) =>
        rule.from.includes(from as TaskStatus) &&
        (rule.to === to || (rule.to === "RESTORE" && to === restoreStatus)),
    );
  }

  private restoreStatus(history: { toStatus: string; fromStatus: string }[]) {
    for (let index = history.length - 1; index >= 0; index--)
      if (history[index].toStatus === HOLD_STATUS)
        return history[index].fromStatus;
    return null;
  }

  private mayAct(
    rule: TransitionRule,
    task: TaskStateSnapshot,
    actor: ActorContext,
  ) {
    return this.authorize(rule.actor, task, actor, false);
  }

  private authorize(
    kind: ActorKind,
    task: TaskStateSnapshot,
    actor: ActorContext,
    throwError = true,
  ) {
    const allowed = this.allowedFor(kind, task, actor);
    if (!allowed && throwError)
      throw new ForbiddenException(
        "Bạn không có quyền thực hiện thao tác này trên công việc.",
      );
    return allowed;
  }

  private allowedFor(
    kind: ActorKind,
    task: TaskStateSnapshot,
    actor: ActorContext,
  ) {
    if (kind === "MANAGER") return this.isManager(actor);
    if (kind === "ASSIGNEE") return this.isAssignee(task, actor);
    return this.isReviewer(task, actor);
  }

  private isManager(actor: ActorContext) {
    return actor.role === "MANAGER" || actor.isSystemAdmin;
  }

  /** Empty assignee keeps management able to unblock legacy rows. */
  private isAssignee(task: TaskStateSnapshot, actor: ActorContext) {
    return task.assignee
      ? matchesActor(task.assignee, actor)
      : this.isManager(actor);
  }

  /** An empty reviewer defaults to the Manager who owns the task. */
  private isReviewer(task: TaskStateSnapshot, actor: ActorContext) {
    return task.reviewer
      ? matchesActor(task.reviewer, actor)
      : this.isManager(actor);
  }

  private assertResumeAllowed(task: TaskStateSnapshot, toStatus: string) {
    if (!["Cần làm", "Đang làm", "Làm lại"].includes(toStatus)) return;
    if (!deadlinePassed(task.date)) return;
    throw new UnprocessableEntityException(
      "Deadline hiện hành đã qua. Cần đề xuất Deadline mới và được Quản lý chấp thuận trước khi tiếp tục.",
    );
  }

  /** Only the move into work waits on the dependency graph; the rest stay free. */
  private decorate(moves: Move[], open: number): AllowedMove[] {
    return moves.map((move) => ({
      ...move,
      blockedBy: move.to === START_STATUS ? open : 0,
    }));
  }

  private async openBlockers(taskIds: readonly string[]) {
    if (!this.blockers) return new Map<string, BlockerRef[]>();
    return this.blockers.openBlockersMany(taskIds);
  }

  private async assertCompletionAllowed(
    rule: TransitionRule,
    task: TaskStateSnapshot,
    actor: ActorContext,
    overrideReason: string,
  ) {
    if (rule.code !== "TR-04" || !this.qa) return false;
    const gate = await this.qa.inspect(task.id);
    if (!gate.blocking.length) return false;
    if (overrideReason && this.isManager(actor)) return true;
    throw new UnprocessableEntityException(
      `Còn ${gate.blocking.length} tiêu chí kiểm tra bắt buộc chưa đạt: ${gate.blocking
        .slice(0, 5)
        .join("; ")}.`,
    );
  }

  /** A task may not enter work while a `BLOCKS` predecessor is still open. */
  private async assertStartAllowed(
    rule: TransitionRule,
    task: TaskStateSnapshot,
    toStatus: string,
    actor: ActorContext,
    overrideReason: string,
  ) {
    if (!this.blockers) return false;
    const target = rule.code === "TR-07" ? toStatus : rule.to;
    if (target !== START_STATUS) return false;
    const open = await this.blockers.openBlockers(task.id);
    if (!open.length) return false;
    if (overrideReason && this.isManager(actor)) return true;
    throw new ConflictException(
      `Chưa thể bắt đầu: ${open.length} công việc chặn chưa xong (${open
        .slice(0, 5)
        .map((item) => item.code)
        .join(
          ", ",
        )}). Hoàn tất hoặc gỡ liên kết trước, hoặc Quản lý ghi đè kèm lý do.`,
    );
  }

  private async recordReason(
    taskId: string,
    author: string,
    reason: string,
    code: string,
  ) {
    if (!this.comments) return;
    // The sink always writes a SYSTEM comment; it only needs who wrote what.
    await this.comments.record({
      taskId,
      author,
      body: `[${code}] ${reason}`.slice(0, 4000),
    });
  }

  private announce(
    task: TaskStateSnapshot,
    rule: TransitionRule,
    actor: ActorContext,
    override: boolean,
    toStatus: string,
  ) {
    const name = task.name.slice(0, 400);
    if (rule.code === "TR-03" || rule.code === "TR-09")
      this.notify(
        task,
        task.reviewer || this.managerRecipients(task).join(","),
        `Task cần kiểm tra: ${name}`,
        `${actor.displayName} đã nộp công việc ${task.code} để kiểm tra.`,
      );
    else if (rule.code === "TR-04")
      this.notify(
        task,
        task.assignee,
        `Kết quả kiểm tra: ${name}`,
        `Công việc ${task.code} đã được xác nhận Hoàn thành${override ? " (Quản lý override QA)" : ""}.`,
      );
    else if (rule.code === "TR-05")
      this.notify(
        task,
        task.assignee,
        `Công việc cần làm lại: ${name}`,
        `${actor.displayName} yêu cầu làm lại công việc ${task.code}.`,
      );
    else if (rule.code === "TR-07")
      this.notify(
        task,
        this.managerRecipients(task),
        `Công việc tiếp tục: ${name}`,
        `Công việc ${task.code} đã được tiếp tục ở trạng thái ${toStatus}.`,
      );
    else
      this.notify(
        task,
        task.assignee,
        `Cập nhật trạng thái: ${name}`,
        `Công việc ${task.code} đã chuyển sang ${toStatus}${override ? " (Quản lý ghi đè điều kiện chặn)" : ""}.`,
      );
  }

  private managerRecipients(task: TaskStateSnapshot) {
    return [task.reviewer, task.assignee].filter(Boolean);
  }

  private notify(
    task: TaskStateSnapshot,
    recipients: string | readonly string[],
    title: string,
    body: string,
  ) {
    if (!this.events) return;
    const joined =
      typeof recipients === "string" ? recipients : recipients.join(",");
    const list = joined
      .split(/[,;\n]/)
      .map((value: string) => value.trim())
      .filter(Boolean);
    if (!list.length) return;
    this.events.emit({
      source: "task",
      recipients: [...new Set(list)],
      title: title.slice(0, 500),
      body: body.slice(0, 2000),
      link: `/work-management/tasks?focus=${task.id}`,
      sourceId: task.id,
    });
  }

  private requestKey(rawKey?: string) {
    const value = rawKey?.trim();
    if (!value) return null;
    const parsed = idempotencyKey.safeParse(value);
    if (!parsed.success)
      throw new BadRequestException("Idempotency-Key không hợp lệ.");
    return parsed.data;
  }

  private kindLabel(kind: string) {
    if (kind === "HOLD") return "hoãn";
    if (kind === "CANCEL") return "hủy";
    return "Deadline mới";
  }
}
