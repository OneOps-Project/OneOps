"use client";
import { useState } from "react";
import {
  lineInput,
  periodInput,
  type LineDto,
  type PeriodDto,
  type Status,
} from "@/features/hr-management/attendance/attendance-reports/types";
import { statusLabels } from "@/features/hr-management/attendance/attendance-reports/constants";
import { client } from "@/features/hr-management/attendance/attendance-reports/api/client";
import { attendanceReportsChanged } from "@/features/hr-management/attendance/attendance-reports/hooks/use-attendance-reports";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/features/hr-management/attendance/attendance-reports/components/primitives/ui";

type FieldErrors = Record<string, string>;

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: FieldErrors = {};
  for (const issue of issues)
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  return result;
}

const thisMonth = () => new Date().toISOString().slice(0, 7);

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
    periodKey: record?.periodKey ?? thisMonth(),
    name: record?.name ?? "",
    fromDate: record?.fromDate ?? `${thisMonth()}-01`,
    toDate: record?.toDate ?? `${thisMonth()}-28`,
    status: (record?.status ?? "DRAFT") as Status,
    note: record?.note ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    if (record) {
      setPending(true);
      try {
        await client.updatePeriod(record, {
          name: values.name,
          status: values.status,
          note: values.note,
        });
        attendanceReportsChanged();
        notify("Đã cập nhật kỳ công.");
        onClose();
      } catch (cause) {
        setFailure(
          cause instanceof Error ? cause.message : "Không thể lưu kỳ công",
        );
      } finally {
        setPending(false);
      }
      return;
    }
    const parsed = periodInput.safeParse(values);
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await client.createPeriod(parsed.data);
      attendanceReportsChanged();
      notify("Đã tạo kỳ công.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu kỳ công",
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
      <Field
        label="Kỳ công"
        error={errors.periodKey}
        hint="Chọn tháng; kỳ công phải trùng tháng của ngày bắt đầu."
      >
        <Input
          type="month"
          value={values.periodKey}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              periodKey: event.target.value,
            }))
          }
          disabled={Boolean(record)}
          required
          aria-invalid={Boolean(errors.periodKey)}
        />
      </Field>
      <Field label="Tên kỳ công" error={errors.name}>
        <Input
          value={values.name}
          onChange={(event) =>
            setValues((current) => ({ ...current, name: event.target.value }))
          }
          maxLength={150}
          required
          aria-invalid={Boolean(errors.name)}
        />
      </Field>
      {!record && (
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
      )}
      <Field
        label="Trạng thái"
        hint="Kỳ đã chốt sẽ khóa việc thêm hoặc sửa dòng công."
      >
        <Select
          value={values.status}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              status: event.target.value as Status,
            }))
          }
        >
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ghi chú" error={errors.note}>
        <Textarea
          value={values.note}
          onChange={(event) =>
            setValues((current) => ({ ...current, note: event.target.value }))
          }
          rows={2}
          maxLength={500}
        />
      </Field>
      <footer className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo kỳ công"}
        </Button>
      </footer>
    </form>
  );
}

export function LineForm({
  periodId,
  record,
  notify,
  onClose,
}: {
  periodId: string;
  record?: LineDto;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    employeeId: record?.employeeId ?? "",
    employeeName: record?.employeeName ?? "",
    workedDays: String(record?.workedDays ?? 0),
    paidLeaveDays: String(record?.paidLeaveDays ?? 0),
    unpaidLeaveDays: String(record?.unpaidLeaveDays ?? 0),
    overtimeHours: String(record?.overtimeHours ?? 0),
    note: record?.note ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    const numbers = {
      workedDays: Number(values.workedDays),
      paidLeaveDays: Number(values.paidLeaveDays),
      unpaidLeaveDays: Number(values.unpaidLeaveDays),
      overtimeHours: Number(values.overtimeHours),
    };
    if (record) {
      setPending(true);
      try {
        await client.updateLine(record, {
          employeeName: values.employeeName,
          note: values.note,
          ...numbers,
        });
        attendanceReportsChanged();
        notify("Đã cập nhật dòng công.");
        onClose();
      } catch (cause) {
        setFailure(
          cause instanceof Error ? cause.message : "Không thể lưu dòng công",
        );
      } finally {
        setPending(false);
      }
      return;
    }
    const parsed = lineInput.safeParse({
      periodId,
      employeeId: values.employeeId,
      employeeName: values.employeeName,
      note: values.note,
      ...numbers,
    });
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await client.createLine(parsed.data);
      attendanceReportsChanged();
      notify("Đã thêm dòng công.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu dòng công",
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
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      )}
      {record && (
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
          />
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ngày công" error={errors.workedDays}>
          <Input
            type="number"
            min={0}
            max={31}
            step="0.5"
            value={values.workedDays}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                workedDays: event.target.value,
              }))
            }
            aria-invalid={Boolean(errors.workedDays)}
          />
        </Field>
        <Field label="Nghỉ có lương" error={errors.paidLeaveDays}>
          <Input
            type="number"
            min={0}
            max={31}
            step="0.5"
            value={values.paidLeaveDays}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                paidLeaveDays: event.target.value,
              }))
            }
            aria-invalid={Boolean(errors.paidLeaveDays)}
          />
        </Field>
        <Field label="Nghỉ không lương" error={errors.unpaidLeaveDays}>
          <Input
            type="number"
            min={0}
            max={31}
            step="0.5"
            value={values.unpaidLeaveDays}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                unpaidLeaveDays: event.target.value,
              }))
            }
            aria-invalid={Boolean(errors.unpaidLeaveDays)}
          />
        </Field>
        <Field label="Giờ tăng ca" error={errors.overtimeHours}>
          <Input
            type="number"
            min={0}
            max={400}
            step="0.5"
            value={values.overtimeHours}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                overtimeHours: event.target.value,
              }))
            }
            aria-invalid={Boolean(errors.overtimeHours)}
          />
        </Field>
      </div>
      <Field label="Ghi chú" error={errors.note}>
        <Textarea
          value={values.note}
          onChange={(event) =>
            setValues((current) => ({ ...current, note: event.target.value }))
          }
          rows={2}
          maxLength={500}
        />
      </Field>
      <footer className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Thêm dòng"}
        </Button>
      </footer>
    </form>
  );
}
