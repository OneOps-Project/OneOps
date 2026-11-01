import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../../core/database/database.module.js";
import { Prisma, type WorkReport } from "@oneops/database";
import { recordSchema } from "./dto/reports.dto.js";
import type { RecordInput, RecordDto, ListQuery } from "./dto/reports.dto.js";
@Injectable()
export class ReportsRepository {
  constructor(private readonly db: Database) {}
  private table(tx: Transaction = this.db) {
    return tx.workReport;
  }
  private dto(row: WorkReport): RecordDto {
    return recordSchema.parse({
      id: row.id,
      module: "reports",
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
    const where: Prisma.WorkReportWhereInput = {
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
  async remove(id: string, version: number, tx: Transaction = this.db) {
    const result = await this.table(tx).deleteMany({ where: { id, version } });
    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException("Bản ghi đã thay đổi. Vui lòng tải lại.");
    }
    return { id };
  }
}
