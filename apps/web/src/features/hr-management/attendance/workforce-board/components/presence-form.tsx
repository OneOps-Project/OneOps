"use client";
import { useState } from "react";
import {
  presenceInput,
  type PresenceDto,
  type Status,
} from "@/features/hr-management/attendance/workforce-board/types";
import { statusLabels } from "@/features/hr-management/attendance/workforce-board/constants";
import { client } from "@/features/hr-management/attendance/workforce-board/api/client";
import { workforceChanged } from "@/features/hr-management/attendance/workforce-board/hooks/use-workforce";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/features/hr-management/attendance/workforce-board/components/primitives/ui";

type FieldErrors = Record<string, string>;

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: FieldErrors = {};
  for (const issue of issues)
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  return result;
}

export function PresenceForm({
  record,
  workDate,
  notify,
  onClose,
}: {
  record?: PresenceDto;
  workDate: string;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    employeeId: record?.employeeId ?? "",
    employeeName: record?.employeeName ?? "",
    workDate: record?.workDate ?? workDate,
    status: (record?.status ?? "IN_OFFICE") as Status,
    shiftLabel: record?.shiftLabel ?? "",
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
        await client.update(record, {
          status: values.status,
          shiftLabel: values.shiftLabel,
          note: values.note,
        });
        workforceChanged();
        notify("Đã cập nhật trạng thái hiện diện.");
        onClose();
      } catch (cause) {
        setFailure(
          cause instanceof Error ? cause.message : "Không thể lưu trạng thái",
        );
      } finally {
        setPending(false);
      }
      return;
    }
    const parsed = presenceInput.safeParse(values);
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await client.create(parsed.data);
      workforceChanged();
      notify("Đã khai báo trạng thái hiện diện.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu trạng thái",
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
      <Field label="Ngày" error={errors.workDate}>
        <Input
          type="date"
          value={values.workDate}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              workDate: event.target.value,
            }))
          }
          disabled={Boolean(record)}
          required
          aria-invalid={Boolean(errors.workDate)}
        />
      </Field>
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
      <Field
        label="Ca / khung giờ"
        error={errors.shiftLabel}
        hint="Ví dụ: 08:00–17:00 hoặc Công tác Hà Nội."
      >
        <Input
          value={values.shiftLabel}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              shiftLabel: event.target.value,
            }))
          }
          maxLength={120}
        />
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
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Khai báo"}
        </Button>
      </footer>
    </form>
  );
}
