import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  createLineSchema,
  createPeriodSchema,
  updateLineSchema,
  updatePeriodSchema,
  type LineInput,
  type LinePatch,
  type LineQuery,
  type PeriodInput,
  type PeriodPatch,
  type PeriodQuery,
} from "./dto/attendance-reports.dto.js";
import { AttendanceReportsRepository } from "./attendance-reports.repository.js";

@Injectable()
export class AttendanceReportsService {
  constructor(private readonly repository: AttendanceReportsRepository) {}

  private assertPeriodWindow(fromDate: string, toDate: string) {
    if (fromDate > toDate)
      throw new UnprocessableEntityException(
        "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
      );
  }

  listPeriods(query: PeriodQuery) {
    return this.repository.listPeriods(query);
  }

  createPeriod(input: PeriodInput) {
    const parsed = new SchemaPipe(createPeriodSchema).transform(input);
    this.assertPeriodWindow(parsed.fromDate, parsed.toDate);
    if (parsed.periodKey !== parsed.fromDate.slice(0, 7))
      throw new UnprocessableEntityException(
        "Kỳ công phải trùng tháng của ngày bắt đầu.",
      );
    return this.repository.createPeriod(parsed);
  }

  async updatePeriod(id: string, patch: PeriodPatch) {
    const parsed = new SchemaPipe(updatePeriodSchema).transform(patch);
    const current = await this.repository.getPeriod(id);
    this.assertPeriodWindow(
      parsed.fromDate ?? current.fromDate,
      parsed.toDate ?? current.toDate,
    );
    if (current.status === "CLOSED" && parsed.status !== "DRAFT")
      throw new ConflictException(
        "Kỳ công đã chốt nên không thể chỉnh sửa. Hãy mở lại ở trạng thái nháp trước.",
      );
    return this.repository.updatePeriod(id, parsed);
  }

  listLines(query: LineQuery) {
    return this.repository.listLines(query);
  }

  async createLine(input: LineInput) {
    const parsed = new SchemaPipe(createLineSchema).transform(input);
    const period = await this.repository.getPeriod(parsed.periodId);
    if (period.status === "CLOSED")
      throw new ConflictException(
        "Kỳ công đã chốt nên không thể thêm dòng công.",
      );
    this.assertLineTotals(parsed);
    return this.repository.createLine(parsed);
  }

  async updateLine(id: string, patch: LinePatch) {
    const parsed = new SchemaPipe(updateLineSchema).transform(patch);
    const current = await this.repository.getLine(id);
    const period = await this.repository.getPeriod(current.periodId);
    if (period.status === "CLOSED")
      throw new ConflictException(
        "Kỳ công đã chốt nên không thể sửa dòng công.",
      );
    this.assertLineTotals({
      workedDays: parsed.workedDays ?? current.workedDays,
      paidLeaveDays: parsed.paidLeaveDays ?? current.paidLeaveDays,
      unpaidLeaveDays: parsed.unpaidLeaveDays ?? current.unpaidLeaveDays,
    });
    return this.repository.updateLine(id, parsed);
  }

  summary(periodId: string) {
    return this.repository.summary(periodId);
  }

  private assertLineTotals(input: {
    workedDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
  }) {
    const total =
      input.workedDays + input.paidLeaveDays + input.unpaidLeaveDays;
    if (total > 31)
      throw new UnprocessableEntityException(
        "Tổng ngày công, nghỉ có lương và nghỉ không lương không vượt quá 31.",
      );
  }
}
