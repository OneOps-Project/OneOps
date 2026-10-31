"use client";
import { useState } from "react";
import {
  applyInput,
  assignmentInput,
  bulkInput,
  type ApplyInput,
  type AssignmentDto,
  type BulkInput,
  type PatternDto,
  type ShiftDto,
} from "@/features/hr-management/attendance/shifts-schedules/types";
import { weekdayLabels } from "@/features/hr-management/attendance/shifts-schedules/constants";
import { client } from "@/features/hr-management/attendance/shifts-schedules/api/client";
import { shiftsChanged } from "@/features/hr-management/attendance/shifts-schedules/hooks/use-shifts";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/features/hr-management/attendance/shifts-schedules/components/primitives/ui";

type FieldErrors = Record<string, string>;

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: FieldErrors = {};
  for (const issue of issues)
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  return result;
}

const today = () => new Date().toISOString().slice(0, 10);

const weekdayName = (weekday: number) =>
  weekdayLabels[weekday as keyof typeof weekdayLabels] ?? `Thứ ${weekday}`;

function parseEmployees(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, ...rest] = line.split(/[|\t,;]/);
      const name = rest.join(" ").trim();
      return { id: id.trim(), name: name || id.trim() };
    });
}

function EmployeeLines({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <Field
      label="Danh sách nhân sự"
      error={error}
      hint="Mỗi dòng một nhân sự, dạng mã|tên. Bỏ trống tên thì dùng mã làm tên."
    >
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={"EMP-001|Nguyễn An\nEMP-002|Trần Bình"}
        aria-invalid={Boolean(error)}
      />
    </Field>
  );
}

export function AssignmentForm({
  record,
  shifts,
  notify,
  onClose,
}: {
  record?: AssignmentDto;
  shifts: ShiftDto[];
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    employeeId: record?.employeeId ?? "",
    employeeName: record?.employeeName ?? "",
    workDate: record?.workDate ?? today(),
    shiftId: record?.shiftId ?? shifts[0]?.id ?? "",
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
        await client.updateAssignment(record, {
          shiftId: values.shiftId,
          note: values.note,
        });
        shiftsChanged();
        notify("Đã cập nhật lịch làm việc.");
        onClose();
      } catch (cause) {
        setFailure(
          cause instanceof Error
            ? cause.message
            : "Không thể lưu lịch làm việc",
        );
      } finally {
        setPending(false);
      }
      return;
    }
    const parsed = assignmentInput.safeParse(values);
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await client.createAssignment(parsed.data);
      shiftsChanged();
      notify("Đã gán ca cho nhân sự.");
      onClose();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Không thể gán ca");
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
      {!record && (
        <Field label="Ngày làm việc" error={errors.workDate}>
          <Input
            type="date"
            value={values.workDate}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                workDate: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.workDate)}
          />
        </Field>
      )}
      <Field label="Ca làm" error={errors.shiftId}>
        <Select
          value={values.shiftId}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              shiftId: event.target.value,
            }))
          }
          required
          aria-invalid={Boolean(errors.shiftId)}
        >
          <option value="">Chọn ca</option>
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {shift.name} ({shift.startTime}–{shift.endTime})
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
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Gán ca"}
        </Button>
      </footer>
    </form>
  );
}

export function BulkAssignForm({
  shifts,
  notify,
  onClose,
}: {
  shifts: ShiftDto[];
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    shiftId: shifts[0]?.id ?? "",
    from: today(),
    to: today(),
    note: "",
    employees: "",
  });
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  function toggleWeekday(day: number) {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort(),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    const parsed = bulkInput.safeParse({
      ...values,
      weekdays,
      employees: parseEmployees(values.employees),
    });
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const result = await client.bulkAssign(parsed.data as BulkInput);
      shiftsChanged();
      notify(
        `Đã gán ${result.created}/${result.total} lượt trong ${result.days} ngày (bỏ qua ${result.skipped} lượt đã có).`,
      );
      onClose();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Không thể gán ca");
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
      <Field label="Ca làm" error={errors.shiftId}>
        <Select
          value={values.shiftId}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              shiftId: event.target.value,
            }))
          }
          required
          aria-invalid={Boolean(errors.shiftId)}
        >
          <option value="">Chọn ca</option>
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {shift.name} ({shift.startTime}–{shift.endTime})
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Từ ngày" error={errors.from}>
          <Input
            type="date"
            value={values.from}
            onChange={(event) =>
              setValues((current) => ({ ...current, from: event.target.value }))
            }
            required
            aria-invalid={Boolean(errors.from)}
          />
        </Field>
        <Field label="Đến ngày" error={errors.to}>
          <Input
            type="date"
            value={values.to}
            onChange={(event) =>
              setValues((current) => ({ ...current, to: event.target.value }))
            }
            required
            aria-invalid={Boolean(errors.to)}
          />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Thứ áp dụng</legend>
        {errors.weekdays && (
          <span className="text-xs text-destructive" role="alert">
            {errors.weekdays}
          </span>
        )}
        <div className="flex flex-wrap gap-3">
          {Object.entries(weekdayLabels).map(([day, label]) => (
            <label key={day} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={weekdays.includes(Number(day))}
                onChange={() => toggleWeekday(Number(day))}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <EmployeeLines
        value={values.employees}
        onChange={(employees) =>
          setValues((current) => ({ ...current, employees }))
        }
        error={errors.employees}
      />
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
      <p className="text-xs text-muted-foreground">
        Khoảng gán tối đa 200 ngày mỗi lần; lượt đã có ca sẽ được bỏ qua thay vì
        ghi đè.
      </p>
      <footer className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang gán…" : "Gán hàng loạt"}
        </Button>
      </footer>
    </form>
  );
}

export function PatternApplyForm({
  pattern,
  notify,
  onClose,
}: {
  pattern: PatternDto;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    from: today(),
    to: today(),
    employees: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    const parsed = applyInput.safeParse({
      ...values,
      employees: parseEmployees(values.employees),
    });
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const result = await client.applyPattern(
        pattern,
        parsed.data as ApplyInput,
      );
      shiftsChanged();
      notify(
        `Đã áp dụng mẫu “${result.pattern}”: ${result.created}/${result.total} lượt (bỏ qua ${result.skipped}).`,
      );
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể áp dụng mẫu tuần",
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
      <p className="text-sm text-muted-foreground">
        Mẫu “{pattern.name}” xếp {pattern.slots.length} ngày mỗi tuần:{" "}
        {pattern.slots.map((slot) => weekdayName(slot.weekday)).join(", ")}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Từ ngày" error={errors.from}>
          <Input
            type="date"
            value={values.from}
            onChange={(event) =>
              setValues((current) => ({ ...current, from: event.target.value }))
            }
            required
            aria-invalid={Boolean(errors.from)}
          />
        </Field>
        <Field label="Đến ngày" error={errors.to}>
          <Input
            type="date"
            value={values.to}
            onChange={(event) =>
              setValues((current) => ({ ...current, to: event.target.value }))
            }
            required
            aria-invalid={Boolean(errors.to)}
          />
        </Field>
      </div>
      <EmployeeLines
        value={values.employees}
        onChange={(employees) =>
          setValues((current) => ({ ...current, employees }))
        }
        error={errors.employees}
      />
      <footer className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang áp dụng…" : "Áp dụng mẫu"}
        </Button>
      </footer>
    </form>
  );
}
