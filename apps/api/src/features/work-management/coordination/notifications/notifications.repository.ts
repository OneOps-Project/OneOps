import { Injectable } from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import type { AccountNotificationInput } from "./dto/notifications.dto.js";
@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: Database) {}
  create(input: AccountNotificationInput, tx: Transaction) {
    return tx.accountNotification.create({ data: input });
  }
  list(recipientId: string) {
    return this.db.accountNotification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
  read(id: string, recipientId: string) {
    return this.db.accountNotification.updateMany({
      where: { id, recipientId },
      data: { readAt: new Date() },
    });
  }
}
