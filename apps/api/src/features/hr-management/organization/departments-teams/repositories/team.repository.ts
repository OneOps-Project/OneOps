import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@oneops/database";
import {
  Database,
  type Transaction,
} from "../../../../../core/database/database.module.js";
import type {
  CreateTeamInput,
  ListQuery,
  OrganizationStatus,
  UpdateTeamInput,
} from "../dto/departments-teams.dto.js";
import type { OrgActor } from "../guards/org-actor.guard.js";

const teamRelations = {
  memberships: { orderBy: { userId: "asc" as const } },
  accessGroups: { orderBy: { groupId: "asc" as const } },
  department: {
    select: {
      id: true,
      name: true,
      status: true,
      administrators: { select: { userId: true } },
    },
  },
};

type TeamWithRelations = Prisma.TeamGetPayload<{
  include: typeof teamRelations;
}>;

@Injectable()
export class TeamRepository {
  constructor(private readonly db: Database) {}

  writeConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError))
      return undefined;
    if (error.code === "P2002") return "duplicate";
    if (error.code === "P2034") return "concurrent";
    return undefined;
  }

  transaction<T>(operation: (tx: Transaction) => Promise<T>) {
    return this.db.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async listByDepartment(
    departmentId: string,
    query: ListQuery,
    actor: OrgActor,
  ) {
    const where: Prisma.TeamWhereInput = {
      departmentId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
      ...(!actor.isSuperAdmin
        ? {
            OR: [
              {
                department: {
                  administrators: { some: { userId: actor.id } },
                },
              },
              { memberships: { some: { userId: actor.id } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.db.$transaction(
      [
        this.db.team.findMany({
          where,
          include: teamRelations,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.db.team.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string, tx: Transaction = this.db) {
    const row = await tx.team.findUnique({
      where: { id },
      include: teamRelations,
    });
    return row ? this.toDto(row) : null;
  }

  async findDepartment(id: string, tx: Transaction = this.db) {
    return tx.department.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
  }

  async countManagers(id: string, tx: Transaction = this.db) {
    return tx.teamMembership.count({
      where: { teamId: id, role: "MANAGER" },
    });
  }

  async findMembership(userId: string, tx: Transaction = this.db) {
    return tx.teamMembership.findFirst({
      where: { userId, role: "MEMBER" },
    });
  }

  async findMembershipWithTeam(userId: string, tx: Transaction = this.db) {
    return tx.teamMembership.findFirst({
      where: { userId, role: "MEMBER" },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            departmentId: true,
            status: true,
            department: { select: { status: true } },
          },
        },
      },
    });
  }

  async create(tx: Transaction, input: CreateTeamInput, createdBy: string) {
    const row = await tx.team.create({
      data: {
        name: input.name,
        departmentId: input.departmentId,
        description: input.description ?? null,
        createdBy,
      },
      select: { id: true },
    });
    const managerIds = new Set(input.managerIds);
    const memberIds = new Set([...input.memberUserIds, ...input.managerIds]);
    await tx.teamMembership.createMany({
      data: [...memberIds].map((userId) => ({
        teamId: row.id,
        userId,
        role: managerIds.has(userId) ? "MANAGER" : "MEMBER",
      })),
    });
    if (input.memberGroupIds.length)
      await tx.teamAccessGroup.createMany({
        data: input.memberGroupIds.map((groupId) => ({
          teamId: row.id,
          groupId,
        })),
      });
    return this.findById(row.id, tx);
  }

  async update(tx: Transaction, id: string, input: UpdateTeamInput) {
    const { managerIds, memberUserIds, memberGroupIds, ...fields } = input;
    delete fields.confirmTransferUserIds;
    await tx.team.update({
      where: { id },
      data: {
        ...(fields.name !== undefined ? { name: fields.name } : {}),
        ...(fields.description !== undefined
          ? { description: fields.description }
          : {}),
      },
    });

    if (managerIds || memberUserIds) {
      const current = await tx.teamMembership.findMany({
        where: { teamId: id },
      });
      const nextManagers = new Set(
        managerIds ??
          current
            .filter((entry) => entry.role === "MANAGER")
            .map((entry) => entry.userId),
      );
      if (nextManagers.size < 1)
        throw new ConflictException("Mỗi Team phải có ít nhất một quản lý.");
      const nextMembers = new Set([
        ...(memberUserIds ??
          current
            .filter((entry) => entry.role === "MEMBER")
            .map((entry) => entry.userId)),
        ...nextManagers,
      ]);
      await tx.teamMembership.deleteMany({ where: { teamId: id } });
      await tx.teamMembership.createMany({
        data: [...nextMembers].map((userId) => ({
          teamId: id,
          userId,
          role: nextManagers.has(userId) ? "MANAGER" : "MEMBER",
        })),
      });
    }

    if (memberGroupIds) {
      await tx.teamAccessGroup.deleteMany({ where: { teamId: id } });
      if (memberGroupIds.length)
        await tx.teamAccessGroup.createMany({
          data: memberGroupIds.map((groupId) => ({ teamId: id, groupId })),
        });
    }

    return this.findById(id, tx);
  }

  async setStatus(tx: Transaction, id: string, status: OrganizationStatus) {
    await tx.team.update({ where: { id }, data: { status } });
    return this.findById(id, tx);
  }

  async transferMember(tx: Transaction, targetTeamId: string, userId: string) {
    const current = await tx.teamMembership.findFirst({
      where: { userId, role: "MEMBER" },
    });
    if (current?.teamId === targetTeamId) return null;
    if (current) {
      await tx.teamMembership.delete({
        where: { teamId_userId: { teamId: current.teamId, userId } },
      });
    }
    await tx.teamMembership.create({
      data: { teamId: targetTeamId, userId, role: "MEMBER" },
    });
    return current;
  }

  private toDto(row: TeamWithRelations) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      departmentId: row.departmentId,
      department: {
        id: row.department.id,
        name: row.department.name,
        status: row.department.status,
        administratorIds: row.department.administrators.map(
          ({ userId }) => userId,
        ),
      },
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      managerIds: row.memberships
        .filter(({ role }) => role === "MANAGER")
        .map(({ userId }) => userId),
      memberUserIds: row.memberships.map(({ userId }) => userId),
      memberGroupIds: row.accessGroups.map(({ groupId }) => groupId),
    };
  }
}
