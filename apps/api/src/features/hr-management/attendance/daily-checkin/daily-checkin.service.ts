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
  type AttendanceInput,
  type AttendancePatch,
  type ListQuery,
} from "./dto/daily-checkin.dto.js";
import { DailyCheckinRepository } from "./daily-checkin.repository.js";

const minutes = (clock: string) => {
  const [hours, mins] = clock.split(":").map(Number);
  return hours * 60 + mins;
};

function statusFor(checkOut?: string | null) {
  return checkOut ? "COMPLETE" : "OPEN";
}

function assertOrder(checkIn: string, checkOut?: string | null) {
  if (checkOut && minutes(checkOut) <= minutes(checkIn))
    throw new UnprocessableEntityException(
      "Giờ ra phải sau giờ vào trong cùng ngày.",
    );
}

@Injectable()
export class DailyCheckinService {
  constructor(private readonly repository: DailyCheckinRepository) {}

  list(query: ListQuery, actor: ActorContext) {
    const own = actor.role === "EMPLOYEE" ? actor.employeeId : undefined;
    if (actor.role === "EMPLOYEE" && !own)
      return Promise.resolve({
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      });
    return this.repository.list(query, own);
  }

  create(input: AttendanceInput, actor: ActorContext) {
    const parsed = new SchemaPipe(createSchema).transform(input);
    if (actor.role === "EMPLOYEE" && parsed.employeeId !== actor.employeeId)
      throw new ForbiddenException("Chỉ được chấm công cho chính mình.");
    assertOrder(parsed.checkIn, parsed.checkOut);
    return this.repository.create(parsed, statusFor(parsed.checkOut));
  }

  async update(id: string, patch: AttendancePatch, actor: ActorContext) {
    const parsed = new SchemaPipe(updateSchema).transform(patch);
    const current = await this.repository.get(id);
    if (actor.role === "EMPLOYEE" && current.employeeId !== actor.employeeId)
      throw new ForbiddenException(
        "Chỉ được sửa bản ghi chấm công của chính mình.",
      );
    if (current.status === "LOCKED")
      throw new ConflictException(
        "Bản ghi đã chốt nên không thể sửa. Hãy gửi đơn giải trình.",
      );
    const checkIn = parsed.checkIn ?? current.checkIn;
    const checkOut =
      parsed.checkOut !== undefined ? parsed.checkOut : current.checkOut;
    assertOrder(checkIn, checkOut);
    return this.repository.update(id, parsed, statusFor(checkOut));
  }

  lock(id: string, version: number) {
    return this.repository.lock(id, version);
  }
}
