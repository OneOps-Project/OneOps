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
  type LeaveQuota,
  type OfficeNetwork,
  type WorkHoliday,
  type WorkPolicy,
} from "@oneops/database";
import {
  holidaySchema,
  networkSchema,
  policySchema,
  quotaSchema,
} from "./dto/work-policies.dto.js";
import type {
  HolidayDto,
  HolidayInput,
  ListQuery,
  NetworkDto,
  NetworkInput,
  PolicyDto,
  PolicyPatch,
  QuotaDto,
  QuotaInput,
} from "./dto/work-policies.dto.js";
const POLICY_KEY = "default";
const toDate = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);
@Injectable()
export class WorkPoliciesRepository {
  constructor(private readonly db: Database) {}
  private policies(tx: Transaction = this.db) {
    return tx.workPolicy;
  }
  private holidays(tx: Transaction = this.db) {
    return tx.workHoliday;
  }
  private networks(tx: Transaction = this.db) {
    return tx.officeNetwork;
  }
  private quotas(tx: Transaction = this.db) {
    return tx.leaveQuota;
  }
  private policyDto(row: WorkPolicy): PolicyDto {
    return policySchema.parse({
      id: row.id,
      timezone: row.timezone,
      workStart: row.workStart,
      workEnd: row.workEnd,
      breakMinutes: row.breakMinutes,
      lateGraceMinutes: row.lateGraceMinutes,
      workDays: [...row.workDays].sort((left, right) => left - right),
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  private holidayDto(row: WorkHoliday): HolidayDto {
    return holidaySchema.parse({
      id: row.id,
      date: row.dateKey,
      name: row.name,
      paid: row.paid,
      note: row.note,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  private networkDto(row: OfficeNetwork): NetworkDto {
    return networkSchema.parse({
      id: row.id,
      label: row.label,
      cidr: row.cidr,
      note: row.note,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  private quotaDto(row: LeaveQuota): QuotaDto {
    return quotaSchema.parse({
      id: row.id,
      year: row.year,
      daysPerYear: row.daysPerYear,
      maxCarryOverDays: row.maxCarryOverDays,
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
  async policy(tx: Transaction = this.db) {
    const row = await this.policies(tx).findUnique({
      where: { key: POLICY_KEY },
    });
    if (row) return this.policyDto(row);
    return this.policyDto(
      await this.unique(
        () => this.policies(tx).create({ data: { key: POLICY_KEY } }),
        "Chính sách làm việc đã được khởi tạo. Vui lòng tải lại.",
      ),
    );
  }
  async updatePolicy(input: PolicyPatch, tx: Transaction = this.db) {
    await this.policy(tx);
    const { version, ...patch } = input;
    const result = await this.policies(tx).updateMany({
      where: { key: POLICY_KEY, version },
      data: { ...patch, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw new ConflictException(
        "Chính sách làm việc đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.policy(tx);
  }
  async listHolidays(query: ListQuery) {
    const where: Prisma.WorkHolidayWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.year ? { dateKey: { startsWith: `${query.year}-` } } : {}),
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
        const rows = await this.holidays(scope).findMany({
          where,
          orderBy: [{ date: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          items: rows.map((row) => this.holidayDto(row)),
          total: await this.holidays(scope).count({ where }),
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async createHoliday(input: HolidayInput, tx: Transaction = this.db) {
    return this.holidayDto(
      await this.unique(
        () =>
          this.holidays(tx).create({
            data: {
              dateKey: input.date,
              date: toDate(input.date),
              name: input.name,
              paid: input.paid,
              note: input.note,
              status: input.status,
            },
          }),
        "Ngày lễ này đã tồn tại.",
      ),
    );
  }
  async updateHoliday(
    id: string,
    input: Partial<HolidayInput> & { version: number },
    tx: Transaction = this.db,
  ) {
    const { version, date, ...patch } = input;
    const result = await this.unique(
      () =>
        this.holidays(tx).updateMany({
          where: { id, version },
          data: {
            ...patch,
            ...(date ? { dateKey: date, date: toDate(date) } : {}),
            version: { increment: 1 },
          },
        }),
      "Ngày lễ này đã tồn tại.",
    );
    if (result.count !== 1) {
      await this.getHoliday(id, tx);
      throw new ConflictException(
        "Ngày lễ đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getHoliday(id, tx);
  }
  async getHoliday(id: string, tx: Transaction = this.db) {
    const row = await this.holidays(tx).findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy ngày lễ.");
    return this.holidayDto(row);
  }
  async listNetworks(query: ListQuery) {
    const where: Prisma.OfficeNetworkWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { label: { contains: query.q, mode: "insensitive" } },
              { cidr: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return this.db.$transaction(
      async (scope) => {
        const rows = await this.networks(scope).findMany({
          where,
          orderBy: [{ status: "asc" }, { label: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          items: rows.map((row) => this.networkDto(row)),
          total: await this.networks(scope).count({ where }),
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async createNetwork(input: NetworkInput, tx: Transaction = this.db) {
    return this.networkDto(
      await this.unique(
        () =>
          this.networks(tx).create({
            data: {
              label: input.label,
              cidr: input.cidr,
              cidrKey: input.cidr.toLowerCase(),
              note: input.note,
              status: input.status,
            },
          }),
        "Dải mạng này đã được khai báo.",
      ),
    );
  }
  async updateNetwork(
    id: string,
    input: Partial<NetworkInput> & { version: number },
    tx: Transaction = this.db,
  ) {
    const { version, cidr, ...patch } = input;
    const result = await this.unique(
      () =>
        this.networks(tx).updateMany({
          where: { id, version },
          data: {
            ...patch,
            ...(cidr ? { cidr, cidrKey: cidr.toLowerCase() } : {}),
            version: { increment: 1 },
          },
        }),
      "Dải mạng này đã được khai báo.",
    );
    if (result.count !== 1) {
      await this.getNetwork(id, tx);
      throw new ConflictException(
        "Mạng văn phòng đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getNetwork(id, tx);
  }
  async getNetwork(id: string, tx: Transaction = this.db) {
    const row = await this.networks(tx).findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy mạng văn phòng.");
    return this.networkDto(row);
  }
  async listQuotas(query: ListQuery) {
    const where: Prisma.LeaveQuotaWhereInput = query.year
      ? { year: query.year }
      : {};
    return this.db.$transaction(
      async (scope) => {
        const rows = await this.quotas(scope).findMany({
          where,
          orderBy: [{ year: "desc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          items: rows.map((row) => this.quotaDto(row)),
          total: await this.quotas(scope).count({ where }),
          page: query.page,
          pageSize: query.pageSize,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async createQuota(input: QuotaInput, tx: Transaction = this.db) {
    return this.quotaDto(
      await this.unique(
        () => this.quotas(tx).create({ data: { ...input } }),
        "Hạn mức của năm này đã tồn tại.",
      ),
    );
  }
  async updateQuota(
    id: string,
    input: Partial<QuotaInput> & { version: number },
    tx: Transaction = this.db,
  ) {
    const { version, ...patch } = input;
    const result = await this.unique(
      () =>
        this.quotas(tx).updateMany({
          where: { id, version },
          data: { ...patch, version: { increment: 1 } },
        }),
      "Hạn mức phép của năm này đã tồn tại.",
    );
    if (result.count !== 1) {
      await this.getQuota(id, tx);
      throw new ConflictException(
        "Hạn mức phép đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    }
    return this.getQuota(id, tx);
  }
  async getQuota(id: string, tx: Transaction = this.db) {
    const row = await this.quotas(tx).findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy hạn mức phép.");
    return this.quotaDto(row);
  }
}
