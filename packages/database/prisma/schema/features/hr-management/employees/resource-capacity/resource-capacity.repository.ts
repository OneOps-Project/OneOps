import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Database } from "../../../../core/database/database.module.js";
import {
  Prisma,
  type CapacityPeriod,
  type ProjectAllocation,
} from "@oneops/database";
import {
  allocationSchema,
  periodSchema,
  type AllocationDto,
  type AllocationInput,
  type AllocationListQuery,
  type AllocationPatch,
  type PeriodDto,
  type PeriodInput,
  type PeriodListQuery,
  type PeriodPatch,
} from "./dto/resource-capacity.dto.js";

@Injectable()
export class ResourceCapacityRepository {
  constructor(private readonly db: Database) {}

  private periods() {
    return this.db.capacityPeriod;
  }

  private allocations() {
    return this.db.projectAllocation;
  }

  private toPeriod(row: CapacityPeriod): PeriodDto {
    return periodSchema.parse({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      fromDate: row.fromDate,
      toDate: row.toDate,
      standardHoursPerDay: row.standardHoursPerDay,
      workingDays: row.workingDays,
      holidayDays: row.holidayDays,
      leaveDays: row.leaveDays,
      note: row.note,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  private toAllocation(row: ProjectAllocation): AllocationDto {
    return allocationSchema.parse({
      id: row.id,
      periodId: row.periodId,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      projectRef: row.projectRef,
      percentage: row.percentage,
      status: row.status,
      note: row.note,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  async listPeriods(query: PeriodListQuery, own?: string) {
    const where: Prisma.CapacityPeriodWhereInput = {
      ...(own
        ? { employeeId: own }
        : query.employeeId
          ? { employeeId: query.employeeId }
          : {}),
      ...(query.from ? { toDate: { gte: query.from } } : {}),
      ...(query.to ? { fromDate: { lte: query.to } } : {}),
      ...(query.q
        ? {
            OR: [
              { employeeName: { contains: query.q, mode: "insensitive" } },
              { note: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.periods().findMany({
        where,
        orderBy: [{ fromDate: "desc" }, { employeeName: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.periods().count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toPeriod(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getPeriod(id: string) {
    const row = await this.periods().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy kỳ công suất.");
    return this.toPeriod(row);
  }

  async createPeriod(input: PeriodInput & { workingDays: number }) {
    try {
      const row = await this.periods().create({ data: { ...input } });
      return this.toPeriod(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "Nhân sự đã có kỳ công suất trùng khoảng ngày.",
        );
      throw error;
    }
  }

  async updatePeriod(id: string, patch: PeriodPatch, workingDays: number) {
    const { version, ...data } = patch;
    const result = await this.periods().updateMany({
      where: { id, version },
      data: { ...data, workingDays, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.getPeriod(id);
      throw new ConflictException(
        "Kỳ công suất đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getPeriod(id);
  }

  async listAllocations(query: AllocationListQuery, own?: string) {
    const where: Prisma.ProjectAllocationWhereInput = {
      ...(query.periodId ? { periodId: query.periodId } : {}),
      ...(own
        ? { employeeId: own }
        : query.employeeId
          ? { employeeId: query.employeeId }
          : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { projectRef: { contains: query.q, mode: "insensitive" } },
              { employeeName: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.allocations().findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.allocations().count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toAllocation(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getAllocation(id: string) {
    const row = await this.allocations().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy phân bổ dự án.");
    return this.toAllocation(row);
  }

  async createAllocation(
    input: AllocationInput & { employeeId: string; employeeName: string },
  ) {
    const row = await this.allocations().create({ data: { ...input } });
    return this.toAllocation(row);
  }

  async updateAllocation(id: string, patch: AllocationPatch) {
    const { version, ...data } = patch;
    const result = await this.allocations().updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.getAllocation(id);
      throw new ConflictException(
        "Phân bổ đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getAllocation(id);
  }

  async cancelAllocation(id: string, version: number) {
    const result = await this.allocations().updateMany({
      where: { id, version },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    if (result.count !== 1) {
      await this.getAllocation(id);
      throw new ConflictException(
        "Phân bổ đã thay đổi. Vui lòng tải lại trước khi hủy.",
      );
    }
    return this.getAllocation(id);
  }

  async allocatedPercent(periodId: string) {
    const result = await this.allocations().aggregate({
      where: { periodId, status: { not: "CANCELLED" } },
      _sum: { percentage: true },
    });
    return result._sum.percentage ?? 0;
  }
}
