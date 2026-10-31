import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import {
  Prisma,
  type ScheduleAssignment,
  type SchedulePattern,
  type ShiftTemplate,
} from "@oneops/database";
import {
  assignmentSchema,
  patternSchema,
  shiftSchema,
} from "./dto/shifts-schedules.dto.js";
import type {
  AssignmentDto,
  AssignmentInput,
  ListQuery,
  PatternDto,
  PatternInput,
  ShiftDto,
  ShiftInput,
} from "./dto/shifts-schedules.dto.js";

const hoursOf = (shift: {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  nightShift: boolean;
}) => {
  const [startHour, startMinute] = shift.startTime.split(":").map(Number);
  const [endHour, endMinute] = shift.endTime.split(":").map(Number);
  let span = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (shift.nightShift && span <= 0) span += 24 * 60;
  return Math.round(((span - shift.breakMinutes) / 60) * 100) / 100;
};

@Injectable()
export class ShiftsSchedulesRepository {
  constructor(private readonly db: Database) {}

  private shifts(tx: Transaction = this.db) {
    return tx.shiftTemplate;
  }
  private patterns(tx: Transaction = this.db) {
    return tx.schedulePattern;
  }
  private assignments(tx: Transaction = this.db) {
    return tx.scheduleAssignment;
  }

  private shiftDto(row: ShiftTemplate, assignmentCount: number): ShiftDto {
    return shiftSchema.parse({
      id: row.id,
      name: row.name,
      startTime: row.startTime,
      endTime: row.endTime,
      breakMinutes: row.breakMinutes,
      nightShift: row.nightShift,
      effectiveFrom: row.effectiveFrom,
      note: row.note,
      status: row.status,
      hours: hoursOf(row),
      assignmentCount,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  private patternDto(row: SchedulePattern): PatternDto {
    return patternSchema.parse({
      id: row.id,
      name: row.name,
      slots: row.slots,
      note: row.note,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  private assignmentDto(row: ScheduleAssignment): AssignmentDto {
    return assignmentSchema.parse({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      workDate: row.workDate,
      shiftId: row.shiftId,
      source: row.source,
      note: row.note,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  private async unique<T>(operation: () => Promise<T>, message: string) {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(message);
      throw error;
    }
  }

  async listShifts(query: ListQuery) {
    const where: Prisma.ShiftTemplateWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { note: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return this.db.$transaction(
      async (scope) => {
        const [rows, counts] = await Promise.all([
          this.shifts(scope).findMany({
            where,
            orderBy: [{ status: "asc" }, { startTime: "asc" }],
            skip: (query.page - 1) * query.pageSize,
            take: query.pageSize,
          }),
          this.assignments(scope).groupBy({
            by: ["shiftId"],
            _count: { _all: true },
          }),
        ]);
        const map = new Map(
          counts.map((item) => [item.shiftId, item._count._all]),
        );
        return {
          items: rows.map((row) => this.shiftDto(row, map.get(row.id) ?? 0)),
          total: await this.shifts(scope).count({ where }),
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async createShift(input: ShiftInput) {
    return this.shiftDto(
      await this.unique(
        () =>
          this.shifts().create({
            data: { ...input, nameKey: input.name.toLocaleLowerCase("vi") },
          }),
        "Tên ca đã tồn tại.",
      ),
      0,
    );
  }

  async getShift(id: string) {
    const row = await this.shifts().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy ca làm việc.");
    return this.shiftDto(
      row,
      await this.assignments().count({ where: { shiftId: id } }),
    );
  }

  async assignmentCount(shiftId: string) {
    return this.assignments().count({ where: { shiftId } });
  }

  async updateShift(
    id: string,
    input: Partial<ShiftInput> & { version: number },
  ) {
    const { version, name, ...patch } = input;
    const result = await this.unique(
      () =>
        this.shifts().updateMany({
          where: { id, version },
          data: {
            ...patch,
            ...(name ? { name, nameKey: name.toLocaleLowerCase("vi") } : {}),
            version: { increment: 1 },
          },
        }),
      "Tên ca đã tồn tại.",
    );
    if (result.count !== 1) {
      await this.getShift(id);
      throw new ConflictException(
        "Ca làm việc đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getShift(id);
  }

  async listPatterns(query: ListQuery) {
    const where: Prisma.SchedulePatternWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    };
    return this.db.$transaction(
      async (scope) => {
        const rows = await this.patterns(scope).findMany({
          where,
          orderBy: [{ status: "asc" }, { name: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          items: rows.map((row) => this.patternDto(row)),
          total: await this.patterns(scope).count({ where }),
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async createPattern(input: PatternInput) {
    return this.patternDto(
      await this.unique(
        () =>
          this.patterns().create({
            data: {
              name: input.name,
              nameKey: input.name.toLocaleLowerCase("vi"),
              slots: input.slots,
              note: input.note,
              status: input.status,
            },
          }),
        "Tên mẫu tuần đã tồn tại.",
      ),
    );
  }

  async getPattern(id: string, tx: Transaction = this.db) {
    const row = await this.patterns(tx).findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy mẫu tuần.");
    return this.patternDto(row);
  }

  async updatePattern(
    id: string,
    input: Partial<PatternInput> & { version: number },
  ) {
    const { version, name, ...patch } = input;
    const result = await this.unique(
      () =>
        this.patterns().updateMany({
          where: { id, version },
          data: {
            ...patch,
            ...(name ? { name, nameKey: name.toLocaleLowerCase("vi") } : {}),
            version: { increment: 1 },
          },
        }),
      "Tên mẫu tuần đã tồn tại.",
    );
    if (result.count !== 1) {
      await this.getPattern(id);
      throw new ConflictException(
        "Mẫu tuần đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getPattern(id);
  }

  async listAssignments(query: ListQuery) {
    const where: Prisma.ScheduleAssignmentWhereInput = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
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
        const rows = await this.assignments(scope).findMany({
          where,
          orderBy: [{ workDate: "asc" }, { employeeName: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          items: rows.map((row) => this.assignmentDto(row)),
          total: await this.assignments(scope).count({ where }),
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async createAssignment(input: AssignmentInput) {
    return this.assignmentDto(
      await this.unique(
        () => this.assignments().create({ data: { ...input } }),
        "Nhân sự đã có ca cho ngày này; không thể gán chồng lấn.",
      ),
    );
  }

  async getAssignment(id: string) {
    const row = await this.assignments().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy lịch làm việc.");
    return this.assignmentDto(row);
  }

  async updateAssignment(
    id: string,
    input: {
      shiftId?: string;
      employeeName?: string;
      note?: string;
      version: number;
    },
  ) {
    const { version, ...patch } = input;
    const result = await this.unique(
      () =>
        this.assignments().updateMany({
          where: { id, version },
          data: { ...patch, version: { increment: 1 } },
        }),
      "Nhân sự đã có ca cho ngày này; không thể gán chồng lấn.",
    );
    if (result.count !== 1) {
      await this.getAssignment(id);
      throw new ConflictException(
        "Lịch làm việc đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getAssignment(id);
  }

  async bulkAssign(
    rows: {
      employeeId: string;
      employeeName: string;
      workDate: string;
      shiftId: string;
      source: string;
      note: string;
    }[],
  ) {
    if (!rows.length) return { created: 0, skipped: 0 };
    const result = await this.assignments().createMany({
      data: rows,
      skipDuplicates: true,
    });
    return { created: result.count, skipped: rows.length - result.count };
  }
}
