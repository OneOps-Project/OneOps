import { Injectable } from "@nestjs/common";
import { Prisma } from "@oneops/database";
import {
  Database,
  type Transaction,
} from "../../../../../core/database/database.module.js";
import type {
  CreateDepartmentInput,
  ListQuery,
  OrganizationStatus,
  UpdateDepartmentInput,
} from "../dto/departments-teams.dto.js";
import type { OrgActor } from "../guards/org-actor.guard.js";

const departmentRelations = (actor?: OrgActor) => ({
  administrators: { orderBy: { userId: "asc" as const } },
  accessUsers: { orderBy: { userId: "asc" as const } },
  accessGroups: { orderBy: { groupId: "asc" as const } },
  teams: {
    ...(actor && !actor.isSuperAdmin
      ? {
          where: {
            OR: [
              {
                department: {
                  administrators: { some: { userId: actor.id } },
                },
              },
              { memberships: { some: { userId: actor.id } } },
            ],
          },
        }
      : {}),
    orderBy: [{ name: "asc" as const }, { id: "asc" as const }],
    select: { id: true, name: true, status: true },
  },
});

type DepartmentWithRelations = Prisma.DepartmentGetPayload<{
  include: ReturnType<typeof departmentRelations>;
}>;

@Injectable()
export class DepartmentRepository {
  constructor(private readonly db: Database) {}

  isUniqueViolation(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  transaction<T>(operation: (tx: Transaction) => Promise<T>) {
    return this.db.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private whereForActor(actor: OrgActor): Prisma.DepartmentWhereInput {
    if (actor.isSuperAdmin) return {};
    return {
      OR: [
        { administrators: { some: { userId: actor.id } } },
        { accessUsers: { some: { userId: actor.id } } },
        {
          teams: {
            some: { memberships: { some: { userId: actor.id } } },
          },
        },
      ],
    };
  }

  async list(query: ListQuery, actor: OrgActor) {
    const where: Prisma.DepartmentWhereInput = {
      ...this.whereForActor(actor),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    };
    const [items, total] = await this.db.$transaction(
      [
        this.db.department.findMany({
          where,
          include: departmentRelations(actor),
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.db.department.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items: items.map((item) => this.toDto(item, actor)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string, tx: Transaction = this.db, actor?: OrgActor) {
    const row = await tx.department.findUnique({
      where: { id },
      include: departmentRelations(actor),
    });
    return row ? this.toDto(row, actor) : null;
  }

  async findActiveByName(
    name: string,
    exceptId?: string,
    tx: Transaction = this.db,
  ) {
    return tx.department.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        status: "ACTIVE",
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
  }

  async canManage(id: string, userId: string, tx: Transaction = this.db) {
    const row = await tx.department.findFirst({
      where: {
        id,
        administrators: { some: { userId } },
      },
      select: { id: true },
    });
    return row !== null;
  }

  async canCreateTeam(id: string, userId: string, tx: Transaction = this.db) {
    const row = await tx.department.findFirst({
      where: {
        id,
        status: "ACTIVE",
        OR: [
          { administrators: { some: { userId } } },
          { accessUsers: { some: { userId } } },
        ],
      },
      select: { id: true },
    });
    return row !== null;
  }

  async canManageTeam(id: string, userId: string, tx: Transaction = this.db) {
    const row = await tx.team.findFirst({
      where: {
        id,
        OR: [
          { department: { administrators: { some: { userId } } } },
          { memberships: { some: { userId, role: "MANAGER" } } },
        ],
      },
      select: { id: true },
    });
    return row !== null;
  }

  async canViewHistory(id: string, userId: string, tx: Transaction = this.db) {
    const row = await tx.department.findFirst({
      where: {
        id,
        OR: [
          { administrators: { some: { userId } } },
          {
            teams: {
              some: {
                memberships: {
                  some: { userId, role: "MANAGER" },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    return row !== null;
  }

  async canView(id: string, actor: OrgActor, tx: Transaction = this.db) {
    if (actor.isSuperAdmin) return true;
    const row = await tx.department.findFirst({
      where: {
        id,
        OR: [
          { administrators: { some: { userId: actor.id } } },
          { accessUsers: { some: { userId: actor.id } } },
          {
            teams: {
              some: { memberships: { some: { userId: actor.id } } },
            },
          },
        ],
      },
      select: { id: true },
    });
    return row !== null;
  }

  async create(
    tx: Transaction,
    input: CreateDepartmentInput,
    createdBy: string,
  ) {
    const row = await tx.department.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        createdBy,
      },
      select: { id: true },
    });
    await tx.departmentAdministrator.createMany({
      data: input.administratorIds.map((userId) => ({
        departmentId: row.id,
        userId,
      })),
    });
    if (input.accessUserIds.length)
      await tx.departmentAccessUser.createMany({
        data: input.accessUserIds.map((userId) => ({
          departmentId: row.id,
          userId,
        })),
      });
    if (input.accessGroupIds.length)
      await tx.departmentAccessGroup.createMany({
        data: input.accessGroupIds.map((groupId) => ({
          departmentId: row.id,
          groupId,
        })),
      });
    return this.findById(row.id, tx);
  }

  async update(tx: Transaction, id: string, input: UpdateDepartmentInput) {
    const { administratorIds, accessUserIds, accessGroupIds, ...fields } =
      input;
    await tx.department.update({
      where: { id },
      data: {
        ...(fields.name !== undefined ? { name: fields.name } : {}),
        ...(fields.description !== undefined
          ? { description: fields.description }
          : {}),
      },
    });
    if (administratorIds) {
      await tx.departmentAdministrator.deleteMany({
        where: { departmentId: id },
      });
      await tx.departmentAdministrator.createMany({
        data: administratorIds.map((userId) => ({
          departmentId: id,
          userId,
        })),
      });
    }
    if (accessUserIds) {
      await tx.departmentAccessUser.deleteMany({
        where: { departmentId: id },
      });
      if (accessUserIds.length)
        await tx.departmentAccessUser.createMany({
          data: accessUserIds.map((userId) => ({
            departmentId: id,
            userId,
          })),
        });
    }
    if (accessGroupIds) {
      await tx.departmentAccessGroup.deleteMany({
        where: { departmentId: id },
      });
      if (accessGroupIds.length)
        await tx.departmentAccessGroup.createMany({
          data: accessGroupIds.map((groupId) => ({
            departmentId: id,
            groupId,
          })),
        });
    }
    return this.findById(id, tx);
  }

  async setStatus(tx: Transaction, id: string, status: OrganizationStatus) {
    await tx.department.update({ where: { id }, data: { status } });
    return this.findById(id, tx);
  }

  async hasActiveTeams(id: string, tx: Transaction = this.db) {
    return (
      (await tx.team.count({
        where: { departmentId: id, status: "ACTIVE" },
      })) > 0
    );
  }

  private toDto(row: DepartmentWithRelations, actor?: OrgActor) {
    const hasDepartmentAccess =
      !actor ||
      actor.isSuperAdmin ||
      row.administrators.some(({ userId }) => userId === actor.id) ||
      row.accessUsers.some(({ userId }) => userId === actor.id);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      administratorIds: hasDepartmentAccess
        ? row.administrators.map(({ userId }) => userId)
        : [],
      accessUserIds: hasDepartmentAccess
        ? row.accessUsers.map(({ userId }) => userId)
        : [],
      accessGroupIds: hasDepartmentAccess
        ? row.accessGroups.map(({ groupId }) => groupId)
        : [],
      teams: row.teams.map((team) => ({
        id: team.id,
        name: team.name,
        status: team.status,
      })),
    };
  }
}
