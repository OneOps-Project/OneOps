import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  applyPatternSchema,
  bulkSchema,
  createAssignmentSchema,
  createPatternSchema,
  createShiftSchema,
  updateAssignmentSchema,
  updatePatternSchema,
  updateShiftSchema,
  type AssignmentInput,
  type ListQuery,
  type PatternInput,
  type ShiftInput,
} from "./dto/shifts-schedules.dto.js";
import { ShiftsSchedulesRepository } from "./shifts-schedules.repository.js";

const minutes = (clock: string) => {
  const [hours, mins] = clock.split(":").map(Number);
  return hours * 60 + mins;
};

const weekdayOf = (dateKey: string) =>
  ((new Date(`${dateKey}T00:00:00.000Z`).getUTCDay() + 6) % 7) + 1;

function datesBetween(from: string, to: string) {
  if (from > to)
    throw new UnprocessableEntityException(
      "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
    );
  const dates: string[] = [];
  for (
    let cursor = new Date(`${from}T00:00:00.000Z`);
    cursor.toISOString().slice(0, 10) <= to;
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    dates.push(cursor.toISOString().slice(0, 10));
    if (dates.length > 200)
      throw new UnprocessableEntityException(
        "Khoảng gán ca tối đa 200 ngày mỗi lần.",
      );
  }
  return dates;
}

function assertShiftWindow(input: {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  nightShift: boolean;
}) {
  const span = minutes(input.endTime) - minutes(input.startTime);
  const total = input.nightShift ? (span <= 0 ? span + 1440 : span) : span;
  if (!input.nightShift && total <= 0)
    throw new UnprocessableEntityException(
      "Giờ kết thúc phải sau giờ bắt đầu, trừ khi bật cờ ca đêm.",
    );
  if (input.nightShift && total === 0)
    throw new UnprocessableEntityException(
      "Ca đêm phải có giờ bắt đầu khác giờ kết thúc.",
    );
  if (input.breakMinutes >= total)
    throw new UnprocessableEntityException(
      "Thời gian nghỉ giữa ca phải nhỏ hơn tổng thời lượng ca.",
    );
}

@Injectable()
export class ShiftsSchedulesService {
  constructor(private readonly repository: ShiftsSchedulesRepository) {}

  listShifts(query: ListQuery) {
    return this.repository.listShifts(query);
  }

  createShift(input: ShiftInput) {
    const parsed = new SchemaPipe(createShiftSchema).transform(input);
    assertShiftWindow(parsed);
    return this.repository.createShift(parsed);
  }

  async updateShift(
    id: string,
    input: Partial<ShiftInput> & { version: number },
  ) {
    const parsed = new SchemaPipe(updateShiftSchema).transform(input);
    const current = await this.repository.getShift(id);
    const next = {
      startTime: parsed.startTime ?? current.startTime,
      endTime: parsed.endTime ?? current.endTime,
      breakMinutes: parsed.breakMinutes ?? current.breakMinutes,
      nightShift: parsed.nightShift ?? current.nightShift,
    };
    assertShiftWindow(next);
    const changesSchedule =
      next.startTime !== current.startTime ||
      next.endTime !== current.endTime ||
      next.breakMinutes !== current.breakMinutes ||
      next.nightShift !== current.nightShift;
    if (changesSchedule && current.assignmentCount > 0)
      throw new ConflictException(
        "Ca đã được gán cho nhân sự nên không thể đổi khung giờ. Hãy tạo ca mới hoặc gỡ lịch cũ trước.",
      );
    return this.repository.updateShift(id, parsed);
  }

  listPatterns(query: ListQuery) {
    return this.repository.listPatterns(query);
  }

  createPattern(input: PatternInput) {
    return this.repository.createPattern(
      new SchemaPipe(createPatternSchema).transform(input),
    );
  }

  updatePattern(
    id: string,
    input: Partial<PatternInput> & { version: number },
  ) {
    return this.repository.updatePattern(
      id,
      new SchemaPipe(updatePatternSchema).transform(input),
    );
  }

  listAssignments(query: ListQuery) {
    return this.repository.listAssignments(query);
  }

  async createAssignment(input: AssignmentInput) {
    const parsed = new SchemaPipe(createAssignmentSchema).transform(input);
    await this.assertAssignable(parsed.shiftId, parsed.workDate);
    return this.repository.createAssignment(parsed);
  }

  updateAssignment(
    id: string,
    input: {
      shiftId?: string;
      employeeName?: string;
      note?: string;
      version: number;
    },
  ) {
    return this.repository.updateAssignment(
      id,
      new SchemaPipe(updateAssignmentSchema).transform(input),
    );
  }

  async bulkAssign(input: unknown) {
    const parsed = new SchemaPipe(bulkSchema).transform(input);
    await this.assertAssignable(parsed.shiftId, parsed.from);
    if (parsed.to < parsed.from)
      throw new UnprocessableEntityException(
        "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
      );
    const dates = datesBetween(parsed.from, parsed.to).filter((date) =>
      parsed.weekdays.includes(weekdayOf(date)),
    );
    const rows = parsed.employees.flatMap((employee) =>
      dates.map((workDate) => ({
        employeeId: employee.id,
        employeeName: employee.name,
        workDate,
        shiftId: parsed.shiftId,
        source: "MANUAL",
        note: parsed.note,
      })),
    );
    return {
      ...(await this.repository.bulkAssign(rows)),
      total: rows.length,
      days: dates.length,
      employees: parsed.employees.length,
    };
  }

  async applyPattern(id: string, input: unknown) {
    const parsed = new SchemaPipe(applyPatternSchema).transform(input);
    const pattern = await this.repository.getPattern(id);
    if (pattern.status !== "ACTIVE")
      throw new ConflictException("Mẫu tuần đã ngừng áp dụng.");
    const dates = datesBetween(parsed.from, parsed.to);
    const rows = parsed.employees.flatMap((employee) =>
      pattern.slots
        .filter((slot) =>
          dates.some((date) => weekdayOf(date) === slot.weekday),
        )
        .flatMap((slot) =>
          dates
            .filter((date) => weekdayOf(date) === slot.weekday)
            .map((workDate) => ({
              employeeId: employee.id,
              employeeName: employee.name,
              workDate,
              shiftId: slot.shiftId,
              source: "PATTERN",
              note: `Mẫu tuần: ${pattern.name}`,
            })),
        ),
    );
    return {
      ...(await this.repository.bulkAssign(rows)),
      total: rows.length,
      employees: parsed.employees.length,
      pattern: pattern.name,
    };
  }

  private async assertAssignable(shiftId: string, workDate: string) {
    const shift = await this.repository.getShift(shiftId);
    if (shift.status !== "ACTIVE")
      throw new ConflictException("Ca làm việc đã ngừng áp dụng.");
    if (workDate < shift.effectiveFrom)
      throw new UnprocessableEntityException(
        `Ca chỉ có hiệu lực từ ${shift.effectiveFrom}.`,
      );
  }
}
