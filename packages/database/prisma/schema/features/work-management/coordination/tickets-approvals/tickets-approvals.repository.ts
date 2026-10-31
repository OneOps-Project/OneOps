import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import { Prisma, type WorkRequest } from "@oneops/database";
import { recordSchema } from "./dto/tickets-approvals.dto.js";
import { dueFrom, type RouteStep } from "./approval-route.js";
import type {
  RecordInput,
  RecordDto,
  ListQuery,
} from "./dto/tickets-approvals.dto.js";
export type StepRow = Prisma.WorkRequestApprovalStepGetPayload<{
  include: { approvers: true };
}>;
export type ApproverRow = Prisma.WorkRequestApproverGetPayload<object>;
@Injectable()
export class TicketsApprovalsRepository {
  constructor(private readonly db: Database) {}
  private table(tx: Transaction = this.db) {
    return tx.workRequest;
  }
  /** Shared mapper: the service and the approval view must see the same shape. */
  toDto(row: WorkRequest): RecordDto {
    return recordSchema.parse({
      id: row.id,
      module: "requests",
      code: row.code,
      name: row.name,
      scope: row.scope,
      status: row.status,
      date: row.date.toISOString().slice(0, 10),
      assignee: row.assignee,
      note: row.note,
      fields: row.fields as RecordDto["fields"],
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  async list(query: ListQuery) {
    const where: Prisma.WorkRequestWhereInput = {
      ...(query.scope !== undefined ? { scope: query.scope } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignee !== undefined ? { assignee: query.assignee } : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: "insensitive" } },
              { name: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return this.db.$transaction(
      async (tx) => ({
        items: (
          await this.table(tx).findMany({
            where,
            orderBy: [{ date: "desc" }, { id: "asc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
          })
        ).map((row) => this.toDto(row)),
        total: await this.table(tx).count({ where }),
        page: query.page,
        pageSize: query.pageSize,
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async get(id: string, tx: Transaction = this.db) {
    const row = await this.table(tx).findUnique({ where: { id } });
    if (!row)
      throw new NotFoundException("Không tìm thấy bản ghi trong phân hệ này.");
    return this.toDto(row);
  }
  async create(input: RecordInput, tx: Transaction = this.db) {
    return this.toDto(
      await this.table(tx).create({
        data: {
          ...input,
          scope: input.scope || "",
          assignee: input.assignee || "",
          note: input.note || "",
          fields: input.fields || {},
          codeKey: input.code.normalize("NFKC").toLocaleLowerCase("vi"),
          date: new Date(input.date + "T00:00:00.000Z"),
        },
      }),
    );
  }
  async update(
    id: string,
    input: Partial<RecordInput> & { version: number },
    tx: Transaction = this.db,
  ) {
    const { version, date, ...patch } = input;
    const result = await this.table(tx).updateMany({
      where: { id, version },
      data: {
        ...patch,
        ...(patch.code
          ? { codeKey: patch.code.normalize("NFKC").toLocaleLowerCase("vi") }
          : {}),
        ...(date ? { date: new Date(date + "T00:00:00.000Z") } : {}),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException(
        "Bản ghi đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.get(id, tx);
  }
  async remove(id: string, version: number, tx: Transaction = this.db) {
    const result = await this.table(tx).deleteMany({ where: { id, version } });
    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException("Bản ghi đã thay đổi. Vui lòng tải lại.");
    }
    return { id };
  }

  transaction<T>(run: (tx: Transaction) => Promise<T>) {
    return this.db.$transaction(run, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }

  /* ---- approval chain --------------------------------------------------- */

  private steps(tx: Transaction = this.db) {
    return tx.workRequestApprovalStep;
  }
  private votesTable(tx: Transaction = this.db) {
    return tx.workRequestApprover;
  }

  /** Steps always arrive in gate order; the UI never re-sorts them. */
  chain(requestId: string, tx: Transaction = this.db): Promise<StepRow[]> {
    return this.steps(tx).findMany({
      where: { requestId },
      orderBy: { position: "asc" },
      include: { approvers: { orderBy: { createdAt: "asc" } } },
    });
  }

  async createChain(requestId: string, route: RouteStep[], tx: Transaction) {
    const now = new Date();
    for (const [index, step] of route.entries())
      await this.steps(tx).create({
        data: {
          requestId,
          position: index + 1,
          name: step.name,
          quorum: step.quorum,
          slaHours: step.slaHours,
          // Only the first gate is actionable; the rest wait for their turn.
          status: index === 0 ? "PENDING" : "WAITING",
          startedAt: now,
          dueAt: dueFrom(now, step.slaHours),
        },
      });
  }

  async step(id: string, tx: Transaction = this.db) {
    const row = await this.steps(tx).findUnique({
      where: { id },
      include: { approvers: { orderBy: { createdAt: "asc" } } },
    });
    if (!row) throw new NotFoundException("Không tìm thấy bước phê duyệt này.");
    return row;
  }

  /** Versioned write of one gate; a stale version means somebody decided first. */
  async updateStep(
    id: string,
    version: number,
    data: Prisma.WorkRequestApprovalStepUpdateManyMutationInput,
    tx: Transaction,
  ) {
    const result = await this.steps(tx).updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1)
      throw new ConflictException(
        "Bước phê duyệt vừa thay đổi. Vui lòng tải lại trước khi quyết định.",
      );
  }

  async recordVote(
    stepId: string,
    vote: { approver: string; displayName: string },
    decision: "APPROVED" | "REJECTED" | "PENDING",
    comment: string,
    tx: Transaction,
  ) {
    const decidedAt = decision === "PENDING" ? null : new Date();
    return this.votesTable(tx).upsert({
      where: { stepId_approver: { stepId, approver: vote.approver } },
      update: { displayName: vote.displayName, decision, comment, decidedAt },
      create: {
        stepId,
        approver: vote.approver,
        displayName: vote.displayName,
        decision,
        comment,
        decidedAt,
      },
    });
  }

  /** A reassignment replaces everyone who has not voted yet. */
  async replaceApprovers(
    stepId: string,
    approvers: { approver: string; displayName: string }[],
    tx: Transaction,
  ) {
    await this.votesTable(tx).deleteMany({
      where: { stepId, decision: "PENDING" },
    });
    await this.votesTable(tx).createMany({
      data: approvers.map((vote) => ({ stepId, ...vote })),
      skipDuplicates: true,
    });
  }

  async skipPending(requestId: string, tx: Transaction) {
    await this.steps(tx).updateMany({
      where: { requestId, status: { in: ["PENDING", "WAITING"] } },
      data: { status: "SKIPPED", version: { increment: 1 } },
    });
  }

  /** Withdrawing a request removes its gates; only undecided requests get here. */
  async removeChain(requestId: string, tx: Transaction) {
    const steps = await this.steps(tx).findMany({
      where: { requestId },
      select: { id: true },
    });
    await this.votesTable(tx).deleteMany({
      where: { stepId: { in: steps.map((step) => step.id) } },
    });
    await this.steps(tx).deleteMany({ where: { requestId } });
  }

  /** Gates past their deadline that were not escalated yet. */
  overdue(now: Date, tx: Transaction = this.db) {
    return this.steps(tx).findMany({
      where: { status: "PENDING", dueAt: { lt: now }, escalatedAt: null },
      include: { approvers: true },
    });
  }

  /** The null guard makes concurrent sweeps escalate a gate only once. */
  async markEscalated(id: string, note: string) {
    const now = new Date();
    const result = await this.steps().updateMany({
      where: { id, escalatedAt: null },
      data: { escalatedAt: now, note },
    });
    return result.count === 1;
  }

  /** A manager also sees role gates; other people only their own assignments. */
  async inbox(
    query: ListQuery,
    accountId: string,
    includeRoleSteps: boolean,
    tx: Transaction = this.db,
  ) {
    const assigned: Prisma.WorkRequestApprovalStepWhereInput = {
      approvers: { some: { approver: accountId } },
    };
    const where: Prisma.WorkRequestApprovalStepWhereInput = {
      status: "PENDING",
      ...(includeRoleSteps
        ? { OR: [assigned, { approvers: { none: {} } }] }
        : assigned),
    };
    const [rows, total] = await Promise.all([
      this.steps(tx).findMany({
        where,
        include: { approvers: { orderBy: { createdAt: "asc" } } },
        orderBy: [{ dueAt: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.steps(tx).count({ where }),
    ]);
    return { rows, total, page: query.page, pageSize: query.pageSize };
  }

  async byIds(ids: string[], tx: Transaction = this.db) {
    if (!ids.length) return [];
    return this.table(tx).findMany({ where: { id: { in: ids } } });
  }
}
