import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { ActorContext } from "../../../../core/auth/actor-context.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  allocationInput,
  allocationPatch,
  capacitySummarySchema,
  periodInput,
  periodPatch,
  versionSchema,
  type AllocationInput,
  type AllocationListQuery,
  type AllocationPatch,
  type PeriodInput,
  type PeriodListQuery,
  type PeriodPatch,
} from "./dto/resource-capacity.dto.js";
import { ResourceCapacityRepository } from "./resource-capacity.repository.js";

const workingDaysBetween = (from: string, to: string) => {
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

const round = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class ResourceCapacityService {
  constructor(private readonly repository: ResourceCapacityRepository) {}

  private ownOf(actor: ActorContext) {
    return actor.role === "EMPLOYEE" ? actor.employeeId : undefined;
  }

  private assertWindow(fromDate: string, toDate: string) {
    if (fromDate > toDate)
      throw new UnprocessableEntityException(
        "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
      );
    const days = workingDaysBetween(fromDate, toDate);
    if (days === 0)
      throw new UnprocessableEntityException(
        "Kỳ công suất phải chứa ít nhất một ngày làm việc.",
      );
    if (days > 366)
      throw new UnprocessableEntityException(
        "Kỳ công suất tối đa 366 ngày làm việc.",
      );
    return days;
  }

  listPeriods(query: PeriodListQuery, actor: ActorContext) {
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && !own)
      return Promise.resolve({
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      });
    return this.repository.listPeriods(query, own);
  }

  createPeriod(input: PeriodInput, actor: ActorContext) {
    const parsed = new SchemaPipe(periodInput).transform(input);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && parsed.employeeId !== own)
      throw new ForbiddenException("Chỉ được tạo kỳ công suất cho chính mình.");
    return this.repository.createPeriod({
      ...parsed,
      workingDays: this.assertWindow(parsed.fromDate, parsed.toDate),
    });
  }

  async updatePeriod(id: string, patch: PeriodPatch, actor: ActorContext) {
    const parsed = new SchemaPipe(periodPatch).transform(patch);
    const current = await this.repository.getPeriod(id);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && current.employeeId !== own)
      throw new ForbiddenException("Chỉ được sửa kỳ công suất của chính mình.");
    return this.repository.updatePeriod(
      id,
      parsed,
      this.assertWindow(
        parsed.fromDate ?? current.fromDate,
        parsed.toDate ?? current.toDate,
      ),
    );
  }

  get(id: string) {
    return this.repository.getPeriod(id);
  }

  async summary(periodId: string, leaveDays?: number) {
    const period = await this.repository.getPeriod(periodId);
    const offDays = period.holidayDays + (leaveDays ?? period.leaveDays);
    const workableDays = Math.max(0, period.workingDays - offDays);
    const availableHours = round(workableDays * period.standardHoursPerDay);
    const allocatedPercent = round(
      await this.repository.allocatedPercent(periodId),
    );
    const allocatedHours = round((availableHours * allocatedPercent) / 100);
    const payload = capacitySummarySchema.parse({
      periodId: period.id,
      employeeId: period.employeeId,
      employeeName: period.employeeName,
      fromDate: period.fromDate,
      toDate: period.toDate,
      workingDays: period.workingDays,
      holidayDays: period.holidayDays,
      leaveDays: leaveDays ?? period.leaveDays,
      standardHoursPerDay: period.standardHoursPerDay,
      availableHours,
      allocatedPercent,
      allocatedHours,
      remainingHours: round(availableHours - allocatedHours),
      utilization: availableHours
        ? round((allocatedHours / availableHours) * 100)
        : 0,
      overCapacity: allocatedHours > availableHours,
    });
    return { period, summary: payload };
  }

  listAllocations(query: AllocationListQuery, actor: ActorContext) {
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && !own)
      return Promise.resolve({
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
      });
    return this.repository.listAllocations(query, own);
  }

  async createAllocation(input: AllocationInput, actor: ActorContext) {
    const parsed = new SchemaPipe(allocationInput).transform(input);
    const period = await this.repository.getPeriod(parsed.periodId);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && period.employeeId !== own)
      throw new ForbiddenException(
        "Chỉ được phân bổ công suất của chính mình.",
      );
    return this.repository.createAllocation({
      ...parsed,
      employeeId: period.employeeId,
      employeeName: period.employeeName,
    });
  }

  async updateAllocation(
    id: string,
    patch: AllocationPatch,
    actor: ActorContext,
  ) {
    const parsed = new SchemaPipe(allocationPatch).transform(patch);
    const current = await this.repository.getAllocation(id);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && current.employeeId !== own)
      throw new ForbiddenException("Chỉ được sửa phân bổ của chính mình.");
    return this.repository.updateAllocation(id, parsed);
  }

  async cancelAllocation(
    id: string,
    input: { version: number },
    actor: ActorContext,
  ) {
    const parsed = new SchemaPipe(versionSchema).transform(input);
    const current = await this.repository.getAllocation(id);
    const own = this.ownOf(actor);
    if (actor.role === "EMPLOYEE" && current.employeeId !== own)
      throw new ForbiddenException("Chỉ được hủy phân bổ của chính mình.");
    return this.repository.cancelAllocation(id, parsed.version);
  }
}
