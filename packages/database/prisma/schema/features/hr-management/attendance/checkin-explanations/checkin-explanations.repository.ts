import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Database } from "../../../../core/database/database.module.js";
import { Prisma, type CheckinExplanation } from "@oneops/database";
import {
  explanationSchema,
  type ExplanationDto,
  type ExplanationInput,
  type ExplanationPatch,
  type ListQuery,
} from "./dto/checkin-explanations.dto.js";

@Injectable()
export class CheckinExplanationsRepository {
  constructor(private readonly db: Database) {}

  private explanations() {
    return this.db.checkinExplanation;
  }

  private toDto(row: CheckinExplanation): ExplanationDto {
    return explanationSchema.parse({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      workDate: row.workDate,
      type: row.type,
      reason: row.reason,
      requestedCheckIn: row.requestedCheckIn,
      requestedCheckOut: row.requestedCheckOut,
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
    const where: Prisma.CheckinExplanationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(own
        ? { employeeId: own }
        : query.employeeId
          ? { employeeId: query.employeeId }
          : {}),
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
              { reason: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.explanations().findMany({
        where,
        orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.explanations().count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string) {
    const row = await this.explanations().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy đơn giải trình.");
    return this.toDto(row);
  }

  async create(input: ExplanationInput) {
    try {
      return this.toDto(
        await this.explanations().create({ data: { ...input } }),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "Đã có đơn giải trình cùng loại cho ngày này.",
        );
      throw error;
    }
  }

  async update(id: string, patch: ExplanationPatch) {
    const { version, ...data } = patch;
    const result = await this.explanations().updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.get(id);
      throw new ConflictException(
        "Đơn giải trình đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.get(id);
  }

  async decide(
    id: string,
    input: { status: "APPROVED" | "REJECTED"; note: string; version: number },
    decidedBy: string,
  ) {
    const result = await this.explanations().updateMany({
      where: { id, version: input.version },
      data: {
        status: input.status,
        decisionNote: input.note,
        decidedBy,
        decidedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      await this.get(id);
      throw new ConflictException(
        "Đơn giải trình đã thay đổi. Vui lòng tải lại trước khi duyệt.",
      );
    }
    return this.get(id);
  }

  async cancel(id: string, version: number) {
    const result = await this.explanations().updateMany({
      where: { id, version },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.get(id);
      throw new ConflictException(
        "Đơn giải trình đã thay đổi. Vui lòng tải lại trước khi hủy.",
      );
    }
    return this.get(id);
  }
}
