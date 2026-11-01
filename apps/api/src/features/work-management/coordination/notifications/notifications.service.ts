import { Injectable } from "@nestjs/common";
import type { Transaction } from "../../../../core/database/database.module.js";
import { NotificationsRepository } from "./notifications.repository.js";
import type { AccountNotificationInput } from "./dto/notifications.dto.js";
@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}
  create(input: AccountNotificationInput, tx: Transaction) {
    return this.repository.create(input, tx);
  }
  list(id: string) {
    return this.repository.list(id);
  }
  read(id: string, recipientId: string) {
    return this.repository.read(id, recipientId);
  }
}
