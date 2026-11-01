import { Injectable } from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
@Injectable()
export class TenantAuthRepository {
  constructor(private readonly db: Database) {}
  session(tokenHash: string) {
    return this.db.authSession.findUnique({ where: { tokenHash } });
  }
  async create(
    tokenHash: string,
    accountId: string,
    accountVersion: number,
    expiresAt: Date,
  ) {
    await this.db.authSession.create({
      data: { tokenHash, accountId, accountVersion, expiresAt },
    });
  }
  revoke(accountId: string, tx: Transaction = this.db) {
    return tx.authSession.deleteMany({ where: { accountId } });
  }
  logout(tokenHash: string) {
    return this.db.authSession.deleteMany({ where: { tokenHash } });
  }
  attempt(key: string) {
    return this.db.authAttempt.findUnique({ where: { key } });
  }
  failure(key: string, reset: boolean) {
    return this.db.authAttempt.upsert({
      where: { key },
      create: { key, failures: 1 },
      update: { failures: reset ? 1 : { increment: 1 } },
    });
  }
  success(key: string) {
    return this.db.authAttempt.deleteMany({ where: { key } });
  }
}
