import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import {
  createSchema,
  updateSchema,
  versionSchema,
  type LeaveRequestInput,
  type LeaveRequestPatch,
  type ListQuery,
} from "./dto/leave-requests.dto.js";
import { LeaveRequestsRepository } from "./leave-requests.repository.js";

const weekdaysBetween = (from: string, to: string) => {
  if (from > to) return 0;
  let days = 0;
  for (
    let cursor = new Date(`${from}T00:00:00.000Z`);
    cursor.toISOString().slice(0, 10) <= to;
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
    if (days > 366) break;
  }
  return days;
};

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly repository: LeaveRequestsRepository) {}

  private ownOf(actor: ActorContext) {
    return actor.role === "EMPLOYEE" ? actor.employeeId : undefined;
  }

  private assertWindow(fromDate: string, toDate: string) {
    if (fromDate > toDate)
      throw new UnprocessableEntityException(
        "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
      );
    const days = weekdaysBetween(fromDate, toDate);
    if (days === 0)
      throw new UnprocessableEntityException(
        "Khoảng nghỉ phải chứa ít nhất một ngày làm việc.",
      );
    if (days > 60)
      throw new UnprocessableEntityException(
        "Mỗi đơn nghỉ phép tối đa 60 ngày làm việc.",
      );
    return days;
  }

  list(query: ListQuery, actor: ActorContext) {
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && !own)
      return Promise.resolve({
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      });
    return this.repository.list(query, own);
  }

  create(input: LeaveRequestInput, actor: ActorContext) {
    const parsed = new SchemaPipe(createSchema).transform(input);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && parsed.employeeId !== own)
      throw new ForbiddenException("Chỉ được gửi đơn nghỉ cho chính mình.");
    return this.repository.create({
      ...parsed,
      days: this.assertWindow(parsed.fromDate, parsed.toDate),
    });
  }

  async update(id: string, patch: LeaveRequestPatch, actor: ActorContext) {
    const parsed = new SchemaPipe(updateSchema).transform(patch);
    const current = await this.repository.get(id);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && current.employeeId !== own)
      throw new ForbiddenException("Chỉ được sửa đơn nghỉ của chính mình.");
    if (current.status !== "PENDING")
      throw new ConflictException("Chỉ sửa được đơn đang chờ duyệt.");
    const days = this.assertWindow(
      parsed.fromDate ?? current.fromDate,
      parsed.toDate ?? current.toDate,
    );
    return this.repository.update(id, parsed, days);
  }

  async cancel(id: string, input: { version: number }, actor: ActorContext) {
    const parsed = new SchemaPipe(versionSchema).transform(input);
    const current = await this.repository.get(id);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && current.employeeId !== own)
      throw new ForbiddenException("Chỉ được hủy đơn nghỉ của chính mình.");
    if (current.status !== "PENDING")
      throw new ConflictException("Chỉ hủy được đơn đang chờ duyệt.");
    return this.repository.cancel(id, parsed.version);
  }

  pending() {
    return this.repository.pending();
  }

  async approvedDays(employeeId: string, from: string, to: string) {
    const ranges = await this.repository.approvedRanges(employeeId, from, to);
    return ranges.reduce((total, range) => {
      const start = range.fromDate > from ? range.fromDate : from;
      const end = range.toDate < to ? range.toDate : to;
      return total + weekdaysBetween(start, end);
    }, 0);
  }

  async applyDecision(
    id: string,
    input: { status: "APPROVED" | "REJECTED"; decidedBy: string; note: string },
  ) {
    const current = await this.repository.get(id);
    if (current.status !== "PENDING")
      throw new ConflictException("Đơn nghỉ phép đã được xử lý.");
    return this.repository.applyDecision(id, input);
  }
}
