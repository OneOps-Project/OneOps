import { Injectable, ConflictException } from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
@Injectable()
export class RolesPermissionsRepository {
  constructor(private readonly db: Database) {}
  async get(accountId: string, tx: Transaction = this.db) {
    return (
      (await tx.accountPermission.findUnique({ where: { accountId } })) || {
        accountId,
        superAdmin: false,
        manageAccounts: false,
        version: 0,
      }
    );
  }
  async grant(accountId: string, manageAccounts: boolean, tx: Transaction) {
    return tx.accountPermission.upsert({
      where: { accountId },
      create: { accountId, manageAccounts },
      update: { manageAccounts, version: { increment: 1 } },
    });
  }
  async bootstrap(accountId: string, tx: Transaction) {
    if (await tx.accountPermission.count({ where: { superAdmin: true } }))
      throw new ConflictException("Đã có quản trị cấp cao.");
    return tx.accountPermission.create({
      data: { accountId, superAdmin: true, manageAccounts: true },
    });
  }
  async assertCanDowngrade(accountId: string, tx: Transaction) {
    const permissions = await this.get(accountId, tx);
    if (permissions.superAdmin)
      throw new ConflictException(
        "Không thể hạ vai trò hoặc khóa quản trị cấp cao. Cần bàn giao quyền quản trị trước.",
      );
  }
  managers(tx: Transaction) {
    return tx.accountPermission.findMany({
      where: { OR: [{ superAdmin: true }, { manageAccounts: true }] },
      select: { accountId: true },
    });
  }
}
