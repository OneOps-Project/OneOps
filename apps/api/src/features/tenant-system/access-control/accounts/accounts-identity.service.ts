import { Injectable } from "@nestjs/common";
import { AccountsRepository } from "./accounts.repository.js";
import { verifyPassword } from "./password.js";
@Injectable()
export class AccountsIdentityService {
  constructor(private readonly repository: AccountsRepository) {}
  get(id: string) {
    return this.repository.get(id);
  }
  async authenticate(login: string, password: string) {
    const row = await this.repository.credentials(login);
    const valid = await verifyPassword(
      password,
      row?.passwordHash ||
        "scrypt:00000000000000000000000000000000:" + "0".repeat(128),
    );
    if (!row || row.status !== "ACTIVE" || !valid) return null;
    const current = await this.repository.get(row.id);
    return current.version === row.version && current.status === "ACTIVE"
      ? current
      : null;
  }
}
