"use client";
import { useState } from "react";
import {
  patternInput,
  shiftInput,
  type PatternDto,
  type ShiftDto,
  type Status,
} from "@/features/hr-management/attendance/shifts-schedules/types";
import {
  statusLabels,
  weekdayLabels,
} from "@/features/hr-management/attendance/shifts-schedules/constants";
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

export function ShiftForm({
  record,
  notify,
  onClose,
}: {
  record?: ShiftDto;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    name: record?.name ?? "",
    startTime: record?.startTime ?? "08:00",
    endTime: record?.endTime ?? "17:00",
    breakMinutes: String(record?.breakMinutes ?? 60),
    nightShift: record?.nightShift ?? false,
    effectiveFrom: record?.effectiveFrom ?? today(),
    note: record?.note ?? "",
    status: (record?.status ?? "ACTIVE") as Status,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  const scheduleLocked = (record?.assignmentCount ?? 0) > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    const parsed = shiftInput.safeParse({
      ...values,
      breakMinutes: Number(values.breakMinutes),
    });
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (record) await client.updateShift(record, parsed.data);
      else await client.createShift(parsed.data);
      shiftsChanged();
      notify(record ? "Đã cập nhật ca làm." : "Đã tạo ca làm.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu ca làm",
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
      {scheduleLocked && (
        <p className="text-xs text-muted-foreground">
          Ca đã được gán cho {record?.assignmentCount} lượt. Khung giờ và thời
          gian nghỉ bị khóa để không làm lệch lịch đã xếp.
        </p>
      )}
      <Field label="Tên ca" error={errors.name}>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Giờ bắt đầu" error={errors.startTime}>
          <Input
            type="time"
            value={values.startTime}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                startTime: event.target.value,
              }))
            }
            disabled={scheduleLocked}
            required
            aria-invalid={Boolean(errors.startTime)}
          />
        </Field>
        <Field label="Giờ kết thúc" error={errors.endTime}>
          <Input
            type="time"
            value={values.endTime}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                endTime: event.target.value,
              }))
            }
            disabled={scheduleLocked}
            required
            aria-invalid={Boolean(errors.endTime)}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Nghỉ giữa ca (phút)"
          error={errors.breakMinutes}
          hint="Thời gian nghỉ phải nhỏ hơn tổng thời lượng ca."
        >
          <Input
            type="number"
            min={0}
            max={240}
            value={values.breakMinutes}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                breakMinutes: event.target.value,
              }))
            }
            disabled={scheduleLocked}
            aria-invalid={Boolean(errors.breakMinutes)}
          />
        </Field>
        <Field label="Ngày hiệu lực" error={errors.effectiveFrom}>
          <Input
            type="date"
            value={values.effectiveFrom}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                effectiveFrom: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.effectiveFrom)}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.nightShift}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              nightShift: event.target.checked,
            }))
          }
          disabled={scheduleLocked}
        />
        Ca đêm (giờ kết thúc sang ngày hôm sau)
      </label>
      <Field label="Trạng thái">
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
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo ca"}
        </Button>
      </footer>
    </form>
  );
}

export function PatternForm({
  record,
  shifts,
  notify,
  onClose,
}: {
  record?: PatternDto;
  shifts: ShiftDto[];
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    name: record?.name ?? "",
    note: record?.note ?? "",
    status: (record?.status ?? "ACTIVE") as Status,
  });
  const [week, setWeek] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const slot of record?.slots ?? [])
      initial[slot.weekday] = slot.shiftId;
    return initial;
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);
  const chosen = Object.values(week).filter(Boolean).length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    const parsed = patternInput.safeParse({
      ...values,
      slots: Object.entries(week)
        .filter(([, shiftId]) => shiftId)
        .map(([weekday, shiftId]) => ({ weekday: Number(weekday), shiftId })),
    });
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (record) await client.updatePattern(record, parsed.data);
      else await client.createPattern(parsed.data);
      shiftsChanged();
      notify(record ? "Đã cập nhật mẫu tuần." : "Đã tạo mẫu tuần.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu mẫu tuần",
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
      <Field label="Tên mẫu tuần" error={errors.name}>
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
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          Ca theo từng thứ ({chosen}/7 ngày)
        </legend>
        {errors.slots && (
          <span className="text-xs text-destructive" role="alert">
            {errors.slots}
          </span>
        )}
        {Object.entries(weekdayLabels).map(([weekday, label]) => (
          <div key={weekday} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-sm">{label}</span>
            <Select
              aria-label={`Ca ${label}`}
              value={week[Number(weekday)] ?? ""}
              onChange={(event) =>
                setWeek((current) => ({
                  ...current,
                  [Number(weekday)]: event.target.value,
                }))
              }
            >
              <option value="">Không xếp ca</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({shift.startTime}–{shift.endTime})
                </option>
              ))}
            </Select>
          </div>
        ))}
      </fieldset>
      <Field label="Trạng thái">
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
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo mẫu"}
        </Button>
      </footer>
    </form>
  );
}
