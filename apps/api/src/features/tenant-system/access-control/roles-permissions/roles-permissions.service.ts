import { Injectable } from "@nestjs/common";
import { RolesPermissionsRepository } from "./roles-permissions.repository.js";
import type { Transaction } from "../../../../core/database/database.module.js";
@Injectable()
export class RolesPermissionsService {
  constructor(private readonly repository: RolesPermissionsRepository) {}
  get(id: string, tx?: Transaction) {
    return this.repository.get(id, tx);
  }
  grant(id: string, value: boolean, tx: Transaction) {
    return this.repository.grant(id, value, tx);
  }
  bootstrap(id: string, tx: Transaction) {
    return this.repository.bootstrap(id, tx);
  }
  assertCanDowngrade(id: string, tx: Transaction) {
    return this.repository.assertCanDowngrade(id, tx);
  }
  managers(tx: Transaction) {
    return this.repository.managers(tx);
  }
}
