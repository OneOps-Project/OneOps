import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Database } from "../../../../core/database/database.module.js";
import { Prisma, type WorkforcePresence } from "@oneops/database";
import {
  presenceSchema,
  type ListQuery,
  type PresenceDto,
  type PresenceInput,
  type PresencePatch,
} from "./dto/workforce-board.dto.js";

@Injectable()
export class WorkforceBoardRepository {
  constructor(private readonly db: Database) {}

  private presence() {
    return this.db.workforcePresence;
  }

  private toDto(row: WorkforcePresence): PresenceDto {
    return presenceSchema.parse({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      workDate: row.workDate,
      status: row.status,
      shiftLabel: row.shiftLabel,
      note: row.note,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  async list(query: ListQuery, own?: string) {
    const where: Prisma.WorkforcePresenceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.workDate ? { workDate: query.workDate } : {}),
      ...(own
        ? { employeeId: own }
        : query.employeeId
          ? { employeeId: query.employeeId }
          : {}),
      ...(query.q
        ? {
            OR: [
              { employeeName: { contains: query.q, mode: "insensitive" } },
              { shiftLabel: { contains: query.q, mode: "insensitive" } },
              { note: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.presence().findMany({
        where,
        orderBy: [{ workDate: "desc" }, { employeeName: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.presence().count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async summary(workDate: string, own?: string) {
    const rows = await this.presence().groupBy({
      by: ["status"],
      where: { workDate, ...(own ? { employeeId: own } : {}) },
      _count: { _all: true },
    });
    const items = rows.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));
    return {
      workDate,
      items,
      total: items.reduce((sum, item) => sum + item.count, 0),
    };
  }

  async get(id: string) {
    const row = await this.presence().findUnique({ where: { id } });
    if (!row)
      throw new NotFoundException("Không tìm thấy trạng thái lực lượng.");
    return this.toDto(row);
  }

  async create(input: PresenceInput) {
    const existing = await this.presence().findUnique({
      where: {
        employeeId_workDate: {
          employeeId: input.employeeId,
          workDate: input.workDate,
        },
      },
    });
    if (existing)
      throw new ConflictException(
        "Nhân sự đã có trạng thái cho ngày này. Hãy cập nhật bản ghi hiện có.",
      );
    return this.toDto(await this.presence().create({ data: { ...input } }));
  }

  async update(id: string, patch: PresencePatch) {
    const { version, ...data } = patch;
    const result = await this.presence().updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.get(id);
      throw new ConflictException(
        "Trạng thái đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.get(id);
  }
}
