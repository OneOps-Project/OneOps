import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import { Prisma, type WorkTask } from "@oneops/database";
import { recordSchema } from "./dto/tasks.dto.js";
import type { RecordInput, RecordDto, ListQuery } from "./dto/tasks.dto.js";
@Injectable()
export class TasksRepository {
  constructor(private readonly db: Database) {}
  private table(tx: Transaction = this.db) {
    return tx.workTask;
  }
  private dto(row: WorkTask): RecordDto {
    return recordSchema.parse({
      id: row.id,
      module: "tasks",
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
    const where: Prisma.WorkTaskWhereInput = {
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
        ).map((row) => this.dto(row)),
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
    return this.dto(row);
  }
  async create(input: RecordInput, tx: Transaction = this.db) {
    return this.dto(
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
  async bindAccountUsername(
    account: { id: string; username: string },
    tx: Transaction,
  ) {
    const rows = await tx.workTask.findMany({
      where: { assignee: account.username },
    });
    for (const row of rows) {
      const fields = (row.fields || {}) as RecordDto["fields"];
      if (fields.assigneeAccountId && fields.assigneeAccountId !== account.id)
        continue;
      await tx.workTask.update({
        where: { id: row.id },
        data: {
          fields: { ...fields, assigneeAccountId: account.id },
          version: { increment: 1 },
        },
      });
    }
  }
  async flagAccountTasks(
    account: {
      id: string;
      employeeId: string;
      employeeCode: string;
      username: string;
    },
    actorId: string,
    tx: Transaction,
  ) {
    const rows = await tx.workTask.findMany({
      where: {
        OR: [
          {
            assignee: {
              in: [
                account.id,
                account.employeeId,
                account.employeeCode,
                account.username,
              ],
            },
          },
          { fields: { path: ["assigneeAccountId"], equals: account.id } },
        ],
        status: { notIn: ["Hoàn thành", "Đã hủy"] },
      },
    });
    for (const row of rows) {
      const fields = (row.fields || {}) as RecordDto["fields"];
      await tx.workTask.update({
        where: { id: row.id },
        data: {
          fields: {
            ...fields,
            reassignmentRequired: true,
            reassignmentReason: "Tài khoản người phụ trách bị khóa",
            reassignmentAt: new Date().toISOString(),
            reassignmentBy: actorId,
          },
          version: { increment: 1 },
        },
      });
    }
    return rows.map((row) => ({
      id: row.id,
      managerAccountId: (row.fields as RecordDto["fields"]).managerAccountId,
    }));
  }
  async remove(id: string, version: number, tx: Transaction = this.db) {
    const result = await this.table(tx).deleteMany({ where: { id, version } });
    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException("Bản ghi đã thay đổi. Vui lòng tải lại.");
    }
    return { id };
  }
}
