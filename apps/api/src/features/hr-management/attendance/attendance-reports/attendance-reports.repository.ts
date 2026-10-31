import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Database } from "../../../../core/database/database.module.js";
import {
  Prisma,
  type AttendancePeriod,
  type AttendancePeriodLine,
} from "@oneops/database";
import {
  lineSchema,
  periodSchema,
  type LineDto,
  type LineInput,
  type LinePatch,
  type LineQuery,
  type PeriodDto,
  type PeriodInput,
  type PeriodPatch,
  type PeriodQuery,
} from "./dto/attendance-reports.dto.js";

@Injectable()
export class AttendanceReportsRepository {
  constructor(private readonly db: Database) {}

  private periods() {
    return this.db.attendancePeriod;
  }
  private lines() {
    return this.db.attendancePeriodLine;
  }

  private periodDto(row: AttendancePeriod, lineCount: number): PeriodDto {
    return periodSchema.parse({
      id: row.id,
      periodKey: row.periodKey,
      name: row.name,
      fromDate: row.fromDate,
      toDate: row.toDate,
      status: row.status,
      note: row.note,
      lineCount,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  private lineDto(row: AttendancePeriodLine): LineDto {
    return lineSchema.parse({
      id: row.id,
      periodId: row.periodId,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      workedDays: row.workedDays,
      paidLeaveDays: row.paidLeaveDays,
      unpaidLeaveDays: row.unpaidLeaveDays,
      overtimeHours: row.overtimeHours,
      note: row.note,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  async listPeriods(query: PeriodQuery) {
    const where: Prisma.AttendancePeriodWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { periodKey: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [rows, total, counts] = await Promise.all([
      this.periods().findMany({
        where,
        orderBy: { periodKey: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.periods().count({ where }),
      this.lines().groupBy({ by: ["periodId"], _count: { _all: true } }),
    ]);
    const map = new Map(
      counts.map((item) => [item.periodId, item._count._all]),
    );
    return {
      items: rows.map((row) => this.periodDto(row, map.get(row.id) ?? 0)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getPeriod(id: string) {
    const row = await this.periods().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy kỳ công.");
    return this.periodDto(
      row,
      await this.lines().count({ where: { periodId: id } }),
    );
  }

  async createPeriod(input: PeriodInput) {
    try {
      return this.periodDto(
        await this.periods().create({ data: { ...input } }),
        0,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("Kỳ công này đã tồn tại.");
      throw error;
    }
  }

  async updatePeriod(id: string, patch: PeriodPatch) {
    const { version, ...data } = patch;
    const result = await this.periods().updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.getPeriod(id);
      throw new ConflictException(
        "Kỳ công đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getPeriod(id);
  }

  async listLines(query: LineQuery) {
    const where: Prisma.AttendancePeriodLineWhereInput = {
      periodId: query.periodId,
      ...(query.q
        ? {
            OR: [
              { employeeName: { contains: query.q, mode: "insensitive" } },
              { employeeId: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.lines().findMany({
        where,
        orderBy: { employeeName: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.lines().count({ where }),
    ]);
    return {
      items: rows.map((row) => this.lineDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getLine(id: string) {
    const row = await this.lines().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy dòng bảng công.");
    return this.lineDto(row);
  }

  async createLine(input: LineInput) {
    try {
      return this.lineDto(await this.lines().create({ data: { ...input } }));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("Nhân sự đã có dòng công trong kỳ này.");
      throw error;
    }
  }

  async updateLine(id: string, patch: LinePatch) {
    const { version, ...data } = patch;
    const result = await this.lines().updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.getLine(id);
      throw new ConflictException(
        "Dòng công đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getLine(id);
  }

  async summary(periodId: string) {
    const aggregate = await this.lines().aggregate({
      where: { periodId },
      _count: { _all: true },
      _sum: {
        workedDays: true,
        paidLeaveDays: true,
        unpaidLeaveDays: true,
        overtimeHours: true,
      },
    });
    return {
      periodId,
      headcount: aggregate._count._all,
      workedDays: aggregate._sum.workedDays ?? 0,
      paidLeaveDays: aggregate._sum.paidLeaveDays ?? 0,
      unpaidLeaveDays: aggregate._sum.unpaidLeaveDays ?? 0,
      overtimeHours: aggregate._sum.overtimeHours ?? 0,
    };
  }
}
