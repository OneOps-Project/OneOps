import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@oneops/database";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import type {
  CreateAccount,
  GroupInput,
  ListAccounts,
} from "./dto/accounts.dto.js";
const accountSelect = {
  id: true,
  employeeId: true,
  employeeCode: true,
  displayName: true,
  username: true,
  email: true,
  role: true,
  status: true,
  version: true,
  createdAt: true,
  updatedAt: true,
} as const;
@Injectable()
export class AccountsRepository {
  constructor(private readonly db: Database) {}
  async transaction<T>(run: (tx: Transaction) => Promise<T>) {
    try {
      return await this.db.$transaction(run, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "Nhân viên, tên đăng nhập, email hoặc directory đã được sử dụng.",
        );
      throw error;
    }
  }
  linkedEmployeeIds(ids: string[]) {
    return this.db.userAccount.findMany({
      where: { employeeId: { in: ids } },
      select: { employeeId: true },
    });
  }
  async count(tx: Transaction = this.db) {
    return tx.userAccount.count();
  }
  async get(id: string, tx: Transaction = this.db) {
    const row = await tx.userAccount.findUnique({
      where: { id },
      select: accountSelect,
    });
    if (!row) throw new NotFoundException("Không tìm thấy tài khoản.");
    return row;
  }
  async credentials(login: string, tx: Transaction = this.db) {
    return tx.userAccount.findFirst({
      where: {
        OR: [{ username: login.toLowerCase() }, { email: login.toLowerCase() }],
      },
    });
  }
  async list(query: ListAccounts) {
    const where: Prisma.UserAccountWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: ["username", "email", "displayName", "employeeCode"].map(
              (key) => ({ [key]: { contains: query.q, mode: "insensitive" } }),
            ),
          }
        : {}),
    };
    return this.db.$transaction(
      async (tx) => ({
        items: await tx.userAccount.findMany({
          where,
          select: accountSelect,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        total: await tx.userAccount.count({ where }),
        page: query.page,
        pageSize: query.pageSize,
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async create(
    input: Omit<CreateAccount, "password"> & {
      employeeCode: string;
      displayName: string;
      passwordHash: string;
    },
    tx: Transaction,
  ) {
    return tx.userAccount.create({ data: input, select: accountSelect });
  }
  async update(
    id: string,
    version: number,
    patch: {
      username?: string;
      email?: string;
      role?: string;
      status?: string;
      passwordHash?: string;
    },
    tx: Transaction,
  ) {
    const result = await tx.userAccount.updateMany({
      where: { id, version },
      data: { ...patch, version: { increment: 1 } },
    });
    if (!result.count) {
      await this.get(id, tx);
      throw new ConflictException("Tài khoản đã thay đổi. Vui lòng tải lại.");
    }
    return this.get(id, tx);
  }
  async listGroups(query: string) {
    return this.db.accountGroup.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { directory: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        owner: { select: accountSelect },
        members: { include: { account: { select: accountSelect } } },
      },
      orderBy: { name: "asc" },
      take: 100,
    });
  }
  async getGroup(id: string, tx: Transaction = this.db) {
    const group = await tx.accountGroup.findUnique({
      where: { id },
      include: {
        owner: { select: accountSelect },
        members: { include: { account: { select: accountSelect } } },
      },
    });
    if (!group) throw new NotFoundException("Không tìm thấy nhóm tài khoản.");
    return group;
  }
  async saveGroup(
    input: GroupInput,
    tx: Transaction,
    id?: string,
    version?: number,
  ) {
    const { memberIds, ...data } = input;
    const ids = [...new Set([input.ownerId, ...memberIds])];
    const count = await tx.userAccount.count({ where: { id: { in: ids } } });
    if (count !== ids.length)
      throw new ConflictException(
        "Chủ sở hữu hoặc thành viên không còn tồn tại.",
      );
    if (!id) {
      const group = await tx.accountGroup.create({
        data: {
          ...data,
          members: { create: ids.map((accountId) => ({ accountId })) },
        },
      });
      return this.getGroup(group.id, tx);
    }
    const result = await tx.accountGroup.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (!result.count) {
      await this.getGroup(id, tx);
      throw new ConflictException("Nhóm đã thay đổi. Vui lòng tải lại.");
    }
    await tx.accountGroupMember.deleteMany({ where: { groupId: id } });
    await tx.accountGroupMember.createMany({
      data: ids.map((accountId) => ({ groupId: id, accountId })),
    });
    return this.getGroup(id, tx);
  }
}
