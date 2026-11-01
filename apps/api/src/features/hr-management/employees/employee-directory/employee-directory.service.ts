import { Injectable } from "@nestjs/common";
import { EmployeeDirectoryRepository } from "./employee-directory.repository.js";
import type { EmployeeInput } from "./dto/employee-directory.dto.js";
import type { Transaction } from "../../../../core/database/database.module.js";
@Injectable()
export class EmployeeDirectoryService {
  constructor(private readonly repository: EmployeeDirectoryRepository) {}
  get(id: string, tx?: Transaction) {
    return this.repository.get(id, tx);
  }
  list(q: string) {
    return this.repository.list(q);
  }
  create(input: EmployeeInput, tx?: Transaction) {
    return this.repository.create(input, tx);
  }
}
