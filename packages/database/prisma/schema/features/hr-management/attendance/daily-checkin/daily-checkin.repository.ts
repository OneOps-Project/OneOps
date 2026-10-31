import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import { Prisma, type AttendanceRecord } from "@oneops/database";
import { recordSchema } from "./dto/daily-checkin.dto.js";
import type {
  AttendanceDto,
  AttendanceInput,
  AttendancePatch,
  ListQuery,
} from "./dto/daily-checkin.dto.js";

@Injectable()
export class DailyCheckinRepository {
  constructor(private readonly db: Database) {}

  private records(tx: Transaction = this.db) {
    return tx.attendanceRecord;
  }

  private toDto(row: AttendanceRecord): AttendanceDto {
    return recordSchema.parse({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      workDate: row.workDate,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      source: row.source,
      note: row.note,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  async list(query: ListQuery, employeeId?: string) {
    const where: Prisma.AttendanceRecordWhereInput = {
      ...(employeeId ? { employeeId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            workDate: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { employeeName: { contains: query.q, mode: "insensitive" } },
              { note: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return this.db.$transaction(
      async (scope) => {
        const rows = await this.records(scope).findMany({
          where,
          orderBy: [{ workDate: "desc" }, { employeeName: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          items: rows.map((row) => this.toDto(row)),
          total: await this.records(scope).count({ where }),
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async create(input: AttendanceInput, status: string) {
    try {
      return this.toDto(
        await this.records().create({
          data: {
            employeeId: input.employeeId,
            employeeName: input.employeeName,
            workDate: input.workDate,
            checkIn: input.checkIn,
            checkOut: input.checkOut ?? null,
            source: input.source,
            note: input.note,
            status,
          },
        }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("Nhân sự đã chấm công ngày này.");
      throw error;
    }
  }

  async get(id: string, tx: Transaction = this.db) {
    const row = await this.records(tx).findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy bản ghi chấm công.");
    return this.toDto(row);
  }

  async update(
    id: string,
    patch: AttendancePatch,
    status: string,
    tx?: Transaction,
  ) {
    const { version, checkOut, ...rest } = patch;
    const result = await this.records(tx).updateMany({
      where: { id, version },
      data: {
        ...rest,
        ...(checkOut !== undefined ? { checkOut } : {}),
        status,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      await this.get(id, tx);
      throw new ConflictException(
        "Bản ghi chấm công đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.get(id, tx);
  }

  async lock(id: string, version: number) {
    const result = await this.records().updateMany({
      where: { id, version },
      data: { status: "LOCKED", version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.get(id);
      throw new ConflictException(
        "Bản ghi chấm công đã thay đổi. Vui lòng tải lại trước khi chốt.",
      );
    }
    return this.get(id);
  }
}
