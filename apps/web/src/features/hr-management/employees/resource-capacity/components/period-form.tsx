"use client";
import { useState } from "react";
import {
  periodInput,
  type PeriodDto,
} from "@/features/hr-management/employees/resource-capacity/types";
import { client } from "@/features/hr-management/employees/resource-capacity/api/client";
import { capacityChanged } from "@/features/hr-management/employees/resource-capacity/hooks/use-capacity";
import {
  Button,
  Field,
  Input,
  Textarea,
} from "@/features/hr-management/employees/resource-capacity/components/primitives/ui";

type FieldErrors = Record<string, string>;

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: FieldErrors = {};
  for (const issue of issues)
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  return result;
}

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 7)}-01`;

export function PeriodForm({
  record,
  notify,
  onClose,
}: {
  record?: PeriodDto;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    employeeId: record?.employeeId ?? "",
    employeeName: record?.employeeName ?? "",
    fromDate: record?.fromDate ?? monthStart(),
    toDate: record?.toDate ?? today(),
    standardHoursPerDay: String(record?.standardHoursPerDay ?? 8),
    holidayDays: String(record?.holidayDays ?? 0),
    note: record?.note ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    const parsed = periodInput.safeParse({
      ...values,
      leaveDays: record?.leaveDays ?? 0,
      standardHoursPerDay: Number(values.standardHoursPerDay),
      holidayDays: Number(values.holidayDays),
    });
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (record)
        await client.updatePeriod(record, {
          fromDate: parsed.data.fromDate,
          toDate: parsed.data.toDate,
          standardHoursPerDay: parsed.data.standardHoursPerDay,
          holidayDays: parsed.data.holidayDays,
          note: parsed.data.note,
        });
      else await client.createPeriod(parsed.data);
      capacityChanged();
      notify(record ? "Đã cập nhật kỳ công suất." : "Đã tạo kỳ công suất.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu kỳ công suất",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}
      {!record && (
        <>
          <Field label="Mã nhân sự" error={errors.employeeId}>
            <Input
              value={values.employeeId}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  employeeId: event.target.value,
                }))
              }
              maxLength={64}
              required
              aria-invalid={Boolean(errors.employeeId)}
            />
          </Field>
          <Field label="Tên nhân sự" error={errors.employeeName}>
            <Input
              value={values.employeeName}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  employeeName: event.target.value,
                }))
              }
              maxLength={200}
              required
              aria-invalid={Boolean(errors.employeeName)}
            />
          </Field>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Từ ngày" error={errors.fromDate}>
          <Input
            type="date"
            value={values.fromDate}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                fromDate: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.fromDate)}
          />
        </Field>
        <Field label="Đến ngày" error={errors.toDate}>
          <Input
            type="date"
            value={values.toDate}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                toDate: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.toDate)}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Giờ chuẩn mỗi ngày"
          error={errors.standardHoursPerDay}
          hint="Lấy từ chính sách làm việc, mặc định 8 giờ."
        >
          <Input
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={values.standardHoursPerDay}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                standardHoursPerDay: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.standardHoursPerDay)}
          />
        </Field>
        <Field
          label="Số ngày lễ trong kỳ"
          error={errors.holidayDays}
          hint="Ngày lễ chung không tính vào giờ khả dụng."
        >
          <Input
            type="number"
            min={0}
            max={366}
            step={0.5}
            value={values.holidayDays}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                holidayDays: event.target.value,
              }))
            }
            aria-invalid={Boolean(errors.holidayDays)}
          />
        </Field>
      </div>
      <Field label="Ghi chú" error={errors.note}>
        <Textarea
          value={values.note}
          onChange={(event) =>
            setValues((current) => ({ ...current, note: event.target.value }))
          }
          maxLength={500}
        />
      </Field>
      <footer className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo kỳ"}
        </Button>
      </footer>
    </form>
  );
}
