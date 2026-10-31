import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Optional,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import { NotificationEvents } from "../../../../core/events/notification-events.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  approvalChainSchema,
  approvalStepSchema,
  cancelInput,
  createSchema,
  decisionInput,
  inboxPageSchema,
  inboxQuery,
  reassignInput,
  updateSchema,
} from "./dto/tickets-approvals.dto.js";
import type {
  ApprovalChain,
  ApprovalStep,
  ListQuery,
  RecordDto,
  RecordInput,
} from "./dto/tickets-approvals.dto.js";
import { dueFrom, routeFor, slaState } from "./approval-route.js";
import { TicketsApprovalsRepository } from "./tickets-approvals.repository.js";
import type { ApproverRow, StepRow } from "./tickets-approvals.repository.js";
import type { Transaction } from "../../../../core/database/database.module.js";

const LINK = "/work-management/tickets-approvals?focus=";
const OPEN = "Chờ duyệt";
const APPROVED = "Đã duyệt";
const REJECTED = "Từ chối";
const CANCELLED = "Đã hủy";

/**
 * Requests are a two-phase record: the CRUD part keeps the content, the
 * approval engine owns the status. Nothing else may write a status directly.
 */
@Injectable()
export class TicketsApprovalsService {
  constructor(
    private readonly repository: TicketsApprovalsRepository,
    @Optional() private readonly events?: NotificationEvents,
  ) {}

  list(query: ListQuery) {
    return this.repository.list(query);
  }

  async get(id: string, tx?: Transaction) {
    return this.repository.get(id, tx);
  }

  /** A new request always starts its first gate; the SLA clock starts with it. */
  async create(rawInput: RecordInput, actor: ActorContext) {
    const input = new SchemaPipe(createSchema).transform(rawInput);
    if (input.status !== OPEN)
      throw new UnprocessableEntityException(
        "Đề xuất mới luôn ở trạng thái Chờ duyệt; trạng thái do quy trình quyết định.",
      );
    const created = await this.repository.transaction(async (tx) => {
      const record = await this.repository.create(input, tx);
      await this.repository.createChain(record.id, routeFor(input.fields), tx);
      return record;
    });
    const chain = await this.repository.chain(created.id);
    this.notify(
      this.recipientsOf(created, chain[0], actor),
      `Đề xuất chờ duyệt: ${created.name}`,
      `${created.code} · ${chain[0]?.name ?? "Bước 1"} · hạn ${this.deadline(chain[0])}`,
      created.id,
    );
    return created;
  }

  /**
   * Content edits stay possible while the request waits, but they restart the
   * running SLA clock because approvers are now looking at different numbers.
   */
  async update(
    id: string,
    input: Partial<RecordInput> & { version: number },
    actor: ActorContext,
  ) {
    const patch = new SchemaPipe(updateSchema).transform(input);
    const record = await this.repository.get(id);
    if (patch.status !== undefined && patch.status !== record.status)
      throw new ConflictException(
        "Trạng thái do quy trình phê duyệt quyết định. Hãy dùng Duyệt, Từ chối hoặc Hủy.",
      );
    if (record.status !== OPEN)
      throw new ConflictException(
        record.status === APPROVED
          ? "Đề xuất đã duyệt nên không sửa được nữa."
          : "Đề xuất đã đóng nên không sửa được.",
      );
    const content = { ...patch, status: undefined };
    const changes = Object.entries(content).some(
      ([key, value]) =>
        value !== undefined &&
        JSON.stringify(value) !==
          JSON.stringify(record[key as keyof RecordDto]),
    );
    const updated = await this.repository.transaction(async (tx) => {
      const saved = await this.repository.update(
        id,
        { ...patch, status: undefined, version: input.version },
        tx,
      );
      if (changes) await this.restartClock(id, tx);
      return saved;
    });
    if (changes) {
      const [chain] = await this.repository.chain(id);
      this.notify(
        this.recipientsOf(updated, chain, actor),
        `Đề xuất vừa được chỉnh sửa: ${updated.name}`,
        "Nội dung thay đổi nên đồng hồ SLA của bước hiện tại được tính lại.",
        updated.id,
      );
    }
    return updated;
  }

  /** Withdrawal is only legal before anyone voted; afterwards it stays as history. */
  async remove(id: string, version: number, actor: ActorContext) {
    const record = await this.repository.get(id);
    if (record.status !== OPEN)
      throw new ConflictException(
        "Đề xuất đã có quyết định nên không xóa được. Hãy Hủy kèm lý do để lưu vết.",
      );
    const chain = await this.repository.chain(id);
    const voted = chain.some((step) =>
      step.approvers.some((vote) => vote.decision !== "PENDING"),
    );
    if (voted)
      throw new ConflictException(
        "Đề xuất đã có người quyết định nên không xóa được. Hãy Hủy kèm lý do để lưu vết.",
      );
    await this.repository.transaction(async (tx) => {
      await this.repository.removeChain(id, tx);
      await this.repository.remove(id, version, tx);
    });
    this.notify(
      [record.assignee],
      `Đề xuất đã được rút: ${record.name}`,
      `${actor.displayName} đã rút đề xuất ${record.code} trước khi có quyết định.`,
      record.id,
    );
    return { id };
  }

  async approval(id: string, actor: ActorContext): Promise<ApprovalChain> {
    await this.sweep();
    const record = await this.repository.get(id);
    const chain = await this.repository.chain(id);
    const active = this.activeOf(chain);
    return approvalChainSchema.parse({
      requestId: record.id,
      status: record.status,
      activeStepId: active?.id ?? null,
      nextDueAt: active?.dueAt.toISOString() ?? null,
      canDecide: active
        ? this.refusal(record, chain, active, actor) === null
        : false,
      canManage: this.isManager(actor),
      canCancel: this.isManager(actor) || this.isRequester(record, actor),
      steps: chain.map((step) => this.stepDto(step)),
    });
  }

  /** Gates assigned to the actor, soonest deadline first. */
  async inbox(rawQuery: unknown, actor: ActorContext) {
    const query = new SchemaPipe(inboxQuery).transform(rawQuery);
    await this.sweep();
    const page = await this.repository.inbox(
      query,
      actor.accountId,
      this.isManager(actor),
    );
    const records = await this.repository.byIds([
      ...new Set(page.rows.map((step) => step.requestId)),
    ]);
    const byId = new Map(records.map((row) => [row.id, row]));
    const items = [];
    for (const step of page.rows) {
      const record = byId.get(step.requestId);
      if (!record || record.status !== OPEN) continue;
      if (this.isRequester(record, actor)) continue;
      if (this.votedBy(step, actor)) continue;
      items.push({
        request: this.repository.toDto(record),
        step: this.stepDto(step),
      });
    }
    return inboxPageSchema.parse({
      items,
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    });
  }

  /**
   * One gate decision. Approval advances the chain (or closes the request),
   * rejection closes it immediately, and a partial quorum keeps the gate open.
   */
  async decide(id: string, rawInput: unknown, actor: ActorContext) {
    const input = new SchemaPipe(decisionInput).transform(rawInput);
    if (input.decision === "REJECT" && input.note.length < 3)
      throw new UnprocessableEntityException(
        "Từ chối đề xuất bắt buộc nhập lý do.",
      );
    const result = await this.repository.transaction(async (tx) => {
      const record = await this.repository.get(id, tx);
      if (record.status !== OPEN)
        throw new ConflictException(
          "Đề xuất không còn ở trạng thái chờ duyệt.",
        );
      const chain = await this.repository.chain(id, tx);
      const active = this.activeOf(chain);
      if (!active)
        throw new ConflictException(
          "Đề xuất không còn bước nào chờ quyết định. Vui lòng tải lại.",
        );
      const refusal = this.refusal(record, chain, active, actor);
      if (refusal) throw new ForbiddenException(refusal);
      await this.repository.recordVote(
        active.id,
        { approver: actor.accountId, displayName: actor.displayName },
        input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
        input.note,
        tx,
      );
      const voted = await this.repository.step(active.id, tx);
      const outcome = this.outcome(voted);
      const now = new Date();
      const next = chain.find((step) => step.position === active.position + 1);
      if (outcome === "REJECTED") {
        await this.repository.updateStep(
          voted.id,
          voted.version,
          {
            status: "REJECTED",
            decidedAt: now,
            decidedBy: actor.displayName,
            note: input.note,
          },
          tx,
        );
        await this.repository.skipPending(id, tx);
        return {
          request: await this.repository.update(
            id,
            { status: REJECTED, version: record.version },
            tx,
          ),
          gate: "REJECTED" as const,
          decidedStep: voted as StepRow,
          next: null,
        };
      }
      if (outcome !== "APPROVED")
        return {
          request: record,
          gate: "PENDING" as const,
          decidedStep: voted as StepRow,
          next: null,
        };
      await this.repository.updateStep(
        voted.id,
        voted.version,
        { status: "APPROVED", decidedAt: now, decidedBy: actor.displayName },
        tx,
      );
      if (next) {
        await this.repository.updateStep(
          next.id,
          next.version,
          {
            status: "PENDING",
            startedAt: now,
            dueAt: dueFrom(now, next.slaHours),
            escalatedAt: null,
            note: "",
          },
          tx,
        );
        return {
          request: record,
          gate: "APPROVED" as const,
          decidedStep: voted as StepRow,
          next: { ...next, status: "PENDING" } as StepRow,
        };
      }
      return {
        request: await this.repository.update(
          id,
          { status: APPROVED, version: record.version },
          tx,
        ),
        gate: "CLOSED" as const,
        decidedStep: voted as StepRow,
        next: null,
      };
    });
    this.announce(result, actor);
    return {
      request: result.request,
      chain: await this.approval(id, actor),
    };
  }

  /** The requester or a manager may withdraw; the reason stays on the record. */
  async cancel(id: string, rawInput: unknown, actor: ActorContext) {
    const input = new SchemaPipe(cancelInput).transform(rawInput);
    const updated = await this.repository.transaction(async (tx) => {
      const record = await this.repository.get(id, tx);
      if (record.status !== OPEN)
        throw new ConflictException("Chỉ hủy được đề xuất đang chờ duyệt.");
      if (!this.isRequester(record, actor) && !this.isManager(actor))
        throw new ForbiddenException(
          "Chỉ người đề xuất hoặc Quản lý được hủy đề xuất.",
        );
      await this.repository.skipPending(id, tx);
      return this.repository.update(
        id,
        {
          status: CANCELLED,
          note: this.appended(record.note, `Hủy: ${input.reason}`),
          version: input.version,
        },
        tx,
      );
    });
    this.notify(
      [updated.assignee],
      `Đề xuất đã hủy: ${updated.name}`,
      `${actor.displayName} đã hủy ${updated.code}: ${input.reason}`,
      updated.id,
    );
    return { request: updated, chain: await this.approval(id, actor) };
  }

  /** A manager hands the running gate to specific people, optionally all of them. */
  async reassign(id: string, rawInput: unknown, actor: ActorContext) {
    const input = new SchemaPipe(reassignInput).transform(rawInput);
    if (!this.isManager(actor))
      throw new ForbiddenException("Chỉ Quản lý được giao lại bước duyệt.");
    const record = await this.repository.get(id);
    if (record.status !== OPEN)
      throw new ConflictException("Đề xuất không còn ở trạng thái chờ duyệt.");
    if (
      this.isRequester(record, actor) &&
      input.approvers.some((name) => this.matches(name, actor))
    )
      throw new UnprocessableEntityException(
        "Không thể giao duyệt cho chính người đề xuất.",
      );
    await this.repository.transaction(async (tx) => {
      const chain = await this.repository.chain(id, tx);
      const active = this.activeOf(chain);
      if (!active)
        throw new ConflictException(
          "Đề xuất không còn bước nào chờ quyết định.",
        );
      await this.repository.replaceApprovers(
        active.id,
        input.approvers.map((name) => ({ approver: name, displayName: name })),
        tx,
      );
      await this.repository.updateStep(
        active.id,
        active.version,
        {
          quorum: input.quorum,
          note: this.appended(
            active.note,
            `Giao lại cho ${input.approvers.join(", ")}${input.note ? ` — ${input.note}` : ""}`,
          ),
        },
        tx,
      );
    });
    this.notify(
      input.approvers,
      `Bạn được giao duyệt: ${record.name}`,
      `${actor.displayName} giao bạn duyệt ${record.code}. Hạn ${this.deadline((await this.repository.chain(id))[0])}.`,
      record.id,
    );
    return { request: record, chain: await this.approval(id, actor) };
  }

  /** Overdue gates are escalated once; any read may trigger the sweep. */
  async sweep() {
    const now = new Date();
    const overdue = await this.repository.overdue(now);
    for (const step of overdue) {
      const note = this.appended(
        step.note,
        `Quá hạn ${step.slaHours} giờ — đã chuyển cấp.`,
      );
      if (!(await this.repository.markEscalated(step.id, note))) continue;
      const record = await this.repository.get(step.requestId);
      this.notify(
        [...step.approvers.map((vote) => vote.displayName), record.assignee],
        `Quá hạn duyệt: ${record.name}`,
        `${record.code} đã quá hạn bước “${step.name}” (${step.slaHours} giờ). Cần xử lý ngay.`,
        record.id,
      );
    }
    return overdue.length;
  }

  private announce(
    result: {
      request: { id: string; code: string; name: string; assignee: string };
      gate: "REJECTED" | "PENDING" | "APPROVED" | "CLOSED";
      decidedStep: StepRow;
      next: StepRow | null;
    },
    actor: ActorContext,
  ) {
    const { request } = result;
    if (result.gate === "PENDING") return;
    if (result.gate === "REJECTED")
      return this.notify(
        [request.assignee],
        `Đề xuất bị từ chối: ${request.name}`,
        `${actor.displayName} từ chối ${request.code} tại bước “${result.decidedStep.name}”.`,
        request.id,
      );
    if (result.next && result.gate === "APPROVED")
      return this.notify(
        result.next.approvers.map((vote) => vote.displayName),
        `Đề xuất chờ duyệt: ${request.name}`,
        `${request.code} đã qua bước trước và chuyển sang “${result.next.name}”.`,
        request.id,
      );
    if (result.gate === "CLOSED")
      return this.notify(
        [request.assignee],
        `Đề xuất đã được duyệt: ${request.name}`,
        `${request.code} đã hoàn tất mọi bước phê duyệt.`,
        request.id,
      );
  }

  /** Everything that can stop the acting person from deciding this gate. */
  private refusal(
    record: RecordDto,
    chain: StepRow[],
    step: StepRow,
    actor: ActorContext,
  ): string | null {
    if (this.isRequester(record, actor))
      return "Không thể tự duyệt đề xuất của chính mình.";
    if (this.votedBy(step, actor)) return "Bạn đã quyết định bước này rồi.";
    const named = step.approvers.length > 0;
    if (named) {
      if (
        !step.approvers.some(
          (vote) =>
            this.matches(vote.approver, actor) ||
            this.matches(vote.displayName, actor),
        )
      )
        return "Bạn không nằm trong danh sách người duyệt của bước này.";
      const earlier = chain.filter((row) => row.position < step.position);
      if (earlier.some((row) => this.matches(row.decidedBy, actor)))
        return "Người duyệt bước trước không duyệt tiếp bước này; hãy giao lại cho người khác.";
      return null;
    }
    if (!this.isManager(actor)) return "Chỉ Quản lý được duyệt bước này.";
    return null;
  }

  private outcome(step: StepRow) {
    const votes = step.approvers;
    if (votes.some((vote) => vote.decision === "REJECTED")) return "REJECTED";
    if (!votes.length) return "PENDING";
    const approved = votes.filter(
      (vote) => vote.decision === "APPROVED",
    ).length;
    if (step.quorum === "ALL")
      return approved === votes.length ? "APPROVED" : "PENDING";
    if (step.quorum === "MAJORITY")
      return approved * 2 > votes.length ? "APPROVED" : "PENDING";
    return approved > 0 ? "APPROVED" : "PENDING";
  }

  private async restartClock(requestId: string, tx: Transaction) {
    const active = this.activeOf(await this.repository.chain(requestId, tx));
    if (!active) return;
    await this.repository.updateStep(
      active.id,
      active.version,
      {
        startedAt: new Date(),
        dueAt: dueFrom(new Date(), active.slaHours),
        escalatedAt: null,
        note: this.appended(
          active.note,
          "Nội dung thay đổi — đồng hồ SLA đặt lại.",
        ),
      },
      tx,
    );
  }

  private stepDto(step: StepRow): ApprovalStep {
    const sla = slaState(step.dueAt, step.slaHours);
    return approvalStepSchema.parse({
      id: step.id,
      position: step.position,
      name: step.name,
      quorum: step.quorum,
      status: step.status,
      slaHours: step.slaHours,
      startedAt: step.startedAt.toISOString(),
      dueAt: step.dueAt.toISOString(),
      decidedAt: step.decidedAt?.toISOString() ?? null,
      decidedBy: step.decidedBy,
      escalatedAt: step.escalatedAt?.toISOString() ?? null,
      note: step.note,
      sla: sla.state,
      remainingMinutes: sla.remainingMinutes,
      approvers: step.approvers.map((vote: ApproverRow) => ({
        id: vote.id,
        approver: vote.approver,
        displayName: vote.displayName,
        decision: vote.decision,
        comment: vote.comment,
        decidedAt: vote.decidedAt?.toISOString() ?? null,
      })),
    });
  }

  private activeOf(chain: StepRow[]) {
    return chain.find((step) => step.status === "PENDING") ?? null;
  }

  private recipientsOf(
    record: RecordDto,
    step: StepRow | undefined,
    actor: ActorContext,
  ) {
    const named = step?.approvers.map((vote) => vote.displayName) ?? [];
    return [...named, record.assignee].filter(
      (name) => name && !this.matches(name, actor),
    );
  }

  private votedBy(step: StepRow, actor: ActorContext) {
    return step.approvers.some(
      (vote) =>
        vote.decision !== "PENDING" && this.matches(vote.approver, actor),
    );
  }

  private isRequester(
    record: { assignee: string; fields: unknown },
    actor: ActorContext,
  ) {
    const fields = record.fields as { requester?: string } | null;
    const names = [record.assignee, fields?.requester ?? ""];
    return names.some((name) => this.matches(name, actor));
  }

  private isManager(actor: ActorContext) {
    return actor.role === "MANAGER" || actor.isSystemAdmin;
  }

  private matches(value: string, actor: ActorContext) {
    const target = value?.trim().toLocaleLowerCase("vi");
    if (!target) return false;
    return [actor.displayName, actor.employeeId, actor.accountId].some(
      (candidate) => candidate.trim().toLocaleLowerCase("vi") === target,
    );
  }

  private appended(note: string, extra: string) {
    const merged = [note.trim(), extra.trim()].filter(Boolean).join(" · ");
    return merged.slice(-500);
  }

  private deadline(step: { dueAt: Date } | undefined) {
    if (!step) return "chưa đặt";
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(step.dueAt);
  }

  private notify(
    recipients: string[],
    title: string,
    body: string,
    sourceId: string,
  ) {
    if (!this.events) return;
    const people = [...new Set(recipients.map((name) => name.trim()))].filter(
      Boolean,
    );
    if (!people.length) return;
    this.events.emit({
      source: "request",
      recipients: people,
      title: title.slice(0, 500),
      body: body.slice(0, 2000),
      link: LINK + sourceId,
      sourceId,
    });
  }
}
