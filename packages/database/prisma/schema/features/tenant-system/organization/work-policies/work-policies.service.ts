import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  createHolidaySchema,
  createNetworkSchema,
  createQuotaSchema,
  updateHolidaySchema,
  updateNetworkSchema,
  updatePolicySchema,
  updateQuotaSchema,
} from "./dto/work-policies.dto.js";
import { WorkPoliciesRepository } from "./work-policies.repository.js";
import type {
  HolidayInput,
  ListQuery,
  NetworkInput,
  PolicyPatch,
  QuotaInput,
} from "./dto/work-policies.dto.js";
import type { Transaction } from "../../../../core/database/database.module.js";

const minutes = (clock: string) => {
  const [hours, mins] = clock.split(":").map(Number);
  return hours * 60 + mins;
};

/** Rejects dates such as 2026-02-31 that match the shape but not the calendar. */
function assertCalendarDate(dateKey: string) {
  const stamp = Date.parse(`${dateKey}T00:00:00.000Z`);
  if (
    Number.isNaN(stamp) ||
    new Date(stamp).toISOString().slice(0, 10) !== dateKey
  )
    throw new UnprocessableEntityException("Ngày lễ không hợp lệ.");
}

@Injectable()
export class WorkPoliciesService {
  constructor(private readonly repository: WorkPoliciesRepository) {}
  read(tx?: Transaction) {
    return this.repository.policy(tx);
  }
  async update(input: PolicyPatch, tx?: Transaction) {
    const parsed = new SchemaPipe(updatePolicySchema).transform(input);
    const current = await this.repository.policy(tx);
    const workStart = parsed.workStart ?? current.workStart;
    const workEnd = parsed.workEnd ?? current.workEnd;
    const breakMinutes = parsed.breakMinutes ?? current.breakMinutes;
    const span = minutes(workEnd) - minutes(workStart);
    if (span <= 0)
      throw new UnprocessableEntityException(
        "Giờ kết thúc phải sau giờ bắt đầu.",
      );
    if (breakMinutes >= span)
      throw new UnprocessableEntityException(
        "Thời gian nghỉ giữa ca phải nhỏ hơn tổng giờ làm việc.",
      );
    return this.repository.updatePolicy(parsed, tx);
  }
  listHolidays(query: ListQuery) {
    return this.repository.listHolidays(query);
  }
  createHoliday(input: HolidayInput, tx?: Transaction) {
    const parsed = new SchemaPipe(createHolidaySchema).transform(input);
    assertCalendarDate(parsed.date);
    return this.repository.createHoliday(parsed, tx);
  }
  updateHoliday(
    id: string,
    input: Partial<HolidayInput> & { version: number },
    tx?: Transaction,
  ) {
    const parsed = new SchemaPipe(updateHolidaySchema).transform(input);
    if (parsed.date) assertCalendarDate(parsed.date);
    return this.repository.updateHoliday(id, parsed, tx);
  }
  listNetworks(query: ListQuery) {
    return this.repository.listNetworks(query);
  }
  createNetwork(input: NetworkInput, tx?: Transaction) {
    return this.repository.createNetwork(
      new SchemaPipe(createNetworkSchema).transform(input),
      tx,
    );
  }
  updateNetwork(
    id: string,
    input: Partial<NetworkInput> & { version: number },
    tx?: Transaction,
  ) {
    return this.repository.updateNetwork(
      id,
      new SchemaPipe(updateNetworkSchema).transform(input),
      tx,
    );
  }
  listQuotas(query: ListQuery) {
    return this.repository.listQuotas(query);
  }
  createQuota(input: QuotaInput, tx?: Transaction) {
    return this.repository.createQuota(
      new SchemaPipe(createQuotaSchema).transform(input),
      tx,
    );
  }
  updateQuota(
    id: string,
    input: Partial<QuotaInput> & { version: number },
    tx?: Transaction,
  ) {
    return this.repository.updateQuota(
      id,
      new SchemaPipe(updateQuotaSchema).transform(input),
      tx,
    );
  }
}
