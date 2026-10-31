import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Database } from "../../../../core/database/database.module.js";
import { Prisma, type LeaveRequest } from "@oneops/database";
import {
  requestSchema,
  type LeaveRequestDto,
  type LeaveRequestInput,
  type LeaveRequestPatch,
  type ListQuery,
} from "./dto/leave-requests.dto.js";

@Injectable()
export class LeaveRequestsRepository {
  constructor(private readonly db: Database) {}

  private requests() {
    return this.db.leaveRequest;
  }

  private toDto(row: LeaveRequest): LeaveRequestDto {
    return requestSchema.parse({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      leaveType: row.leaveType,
      fromDate: row.fromDate,
      toDate: row.toDate,
      days: row.days,
      reason: row.reason,
      status: row.status,
      decidedBy: row.decidedBy,
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      decisionNote: row.decisionNote,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  async list(query: ListQuery, own?: string) {
    const where: Prisma.LeaveRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.leaveType ? { leaveType: query.leaveType } : {}),
      ...(own
        ? { employeeId: own }
        : query.employeeId
          ? { employeeId: query.employeeId }
          : {}),
      ...(query.from || query.to
        ? {
            fromDate: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { employeeName: { contains: query.q, mode: "insensitive" } },
              { reason: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.requests().findMany({
        where,
        orderBy: [{ fromDate: "desc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.requests().count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async pending() {
    const rows = await this.requests().findMany({
      where: { status: "PENDING" },
      orderBy: [{ fromDate: "asc" }, { createdAt: "asc" }],
      take: 200,
    });
    return rows.map((row) => this.toDto(row));
  }

  async approvedRanges(employeeId: string, from: string, to: string) {
    return this.requests().findMany({
      where: {
        employeeId,
        status: "APPROVED",
        fromDate: { lte: to },
        toDate: { gte: from },
      },
      select: { fromDate: true, toDate: true },
    });
  }

  async get(id: string) {
    const row = await this.requests().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy đơn nghỉ phép.");
    return this.toDto(row);
  }

  async create(input: LeaveRequestInput) {
    return this.toDto(await this.requests().create({ data: { ...input } }));
  }

  async update(id: string, patch: LeaveRequestPatch, days: number) {
    const { version, ...data } = patch;
    const result = await this.requests().updateMany({
      where: { id, version },
      data: { ...data, days, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.get(id);
      throw new ConflictException(
        "Đơn nghỉ phép đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.get(id);
  }

  async cancel(id: string, version: number) {
    const result = await this.requests().updateMany({
      where: { id, version },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.get(id);
      throw new ConflictException(
        "Đơn nghỉ phép đã thay đổi. Vui lòng tải lại trước khi hủy.",
      );
    }
    return this.get(id);
  }

  async applyDecision(
    id: string,
    input: {
      status: "APPROVED" | "REJECTED";
      decidedBy: string;
      note: string;
    },
  ) {
    const result = await this.requests().updateMany({
      where: { id },
      data: {
        status: input.status,
        decidedBy: input.decidedBy,
        decisionNote: input.note,
        decidedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1)
      throw new NotFoundException("Không tìm thấy đơn nghỉ phép.");
    return this.get(id);
  }
}
