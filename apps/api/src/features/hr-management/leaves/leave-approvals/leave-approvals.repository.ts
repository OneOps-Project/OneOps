import { Injectable } from "@nestjs/common";
import { Database } from "../../../../core/database/database.module.js";
import { Prisma, type LeaveDecision } from "@oneops/database";
import {
  decisionSchema,
  snapshotSchema,
  type DecisionDto,
  type DecisionSnapshot,
  type ListQuery,
} from "./dto/leave-approvals.dto.js";

@Injectable()
export class LeaveApprovalsRepository {
  constructor(private readonly db: Database) {}

  private decisions() {
    return this.db.leaveDecision;
  }

  private toDto(row: LeaveDecision): DecisionDto {
    return decisionSchema.parse({
      id: row.id,
      requestId: row.requestId,
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      leaveType: row.leaveType,
      fromDate: row.fromDate,
      toDate: row.toDate,
      days: row.days,
      reason: row.reason,
      status: row.status,
      decidedBy: row.decidedBy,
      decisionNote: row.decisionNote,
      decidedAt: row.decidedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    });
  }

  async list(query: ListQuery, own?: string) {
    const where: Prisma.LeaveDecisionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
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
              { decidedBy: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.decisions().findMany({
        where,
        orderBy: [{ decidedAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.decisions().count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async upsert(input: DecisionSnapshot) {
    const data = snapshotSchema.parse(input);
    const row = await this.decisions().upsert({
      where: { requestId: data.requestId },
      create: data,
      update: { ...data, decidedAt: new Date() },
    });
    return this.toDto(row);
  }
}
