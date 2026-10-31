"use client";
import { useState } from "react";
import {
  recordInput,
  type AttendanceDto,
  type AttendanceInput,
  type Source,
} from "@/features/hr-management/attendance/daily-checkin/types";
import { sourceLabels } from "@/features/hr-management/attendance/daily-checkin/constants";
import { client } from "@/features/hr-management/attendance/daily-checkin/api/client";
import { checkinChanged } from "@/features/hr-management/attendance/daily-checkin/hooks/use-checkins";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/features/hr-management/attendance/daily-checkin/components/primitives/ui";

type FieldErrors = Record<string, string>;

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: FieldErrors = {};
  for (const issue of issues)
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  return result;
}

const today = () => new Date().toISOString().slice(0, 10);

export function CheckinForm({
  record,
  notify,
  onClose,
}: {
  record?: AttendanceDto;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    employeeId: record?.employeeId ?? "",
    employeeName: record?.employeeName ?? "",
    workDate: record?.workDate ?? today(),
    checkIn: record?.checkIn ?? "08:30",
    checkOut: record?.checkOut ?? "",
    source: (record?.source ?? "WEB") as Source,
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
      setErrors({});
      setPending(true);
      try {
        await client.update(record, {
          checkIn: values.checkIn,
          checkOut: values.checkOut || null,
          note: values.note,
        });
        notify("Đã cập nhật lượt chấm công.");
        checkinChanged();
        onClose();
      } catch (cause) {
        setFailure(
          cause instanceof Error ? cause.message : "Không thể lưu chấm công",
        );
      } finally {
        setPending(false);
      }
      return;
    }
    const parsed = recordInput.safeParse({
      ...values,
      checkOut: values.checkOut || null,
    });
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await client.create(parsed.data as AttendanceInput);
      notify("Đã ghi nhận chấm công.");
      checkinChanged();
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu chấm công",
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
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Giờ vào"
          error={errors.checkIn}
          hint={record ? "Sửa giờ vào sẽ cập nhật lại trạng thái." : undefined}
        >
          <Input
            type="time"
            value={values.checkIn}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                checkIn: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.checkIn)}
          />
        </Field>
        <Field label="Giờ ra" error={errors.checkOut}>
          <Input
            type="time"
            value={values.checkOut}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                checkOut: event.target.value,
              }))
            }
            aria-invalid={Boolean(errors.checkOut)}
          />
        </Field>
      </div>
      {!record && (
        <Field label="Nguồn ghi nhận">
          <Select
            value={values.source}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                source: event.target.value as Source,
              }))
            }
          >
            {Object.entries(sourceLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      )}
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
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Ghi nhận"}
        </Button>
      </footer>
    </form>
  );
}
