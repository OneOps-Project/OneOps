import { Injectable, NotFoundException } from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import type { EmployeeInput } from "./dto/employee-directory.dto.js";
@Injectable()
export class EmployeeDirectoryRepository {
  constructor(private readonly db: Database) {}
  async get(id: string, tx: Transaction = this.db) {
    const row = await tx.employeeProfile.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Hồ sơ nhân viên không tồn tại.");
    return row;
  }
  list(q: string) {
    return this.db.employeeProfile.findMany({
      where: {
        status: "ACTIVE",
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { code: { contains: q, mode: "insensitive" as const } },
                { email: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { code: "asc" },
      take: 100,
    });
  }
  create(input: EmployeeInput, tx?: Transaction) {
    return (tx || this.db).employeeProfile.create({ data: input });
  }
}
