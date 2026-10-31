"use client";
import { useState } from "react";
import {
  leaveInput,
  type LeaveDto,
  type LeaveType,
} from "@/features/hr-management/leaves/leave-requests/types";
import { leaveTypeLabels } from "@/features/hr-management/leaves/leave-requests/constants";
import { client } from "@/features/hr-management/leaves/leave-requests/api/client";
import { leaveRequestsChanged } from "@/features/hr-management/leaves/leave-requests/hooks/use-leave-requests";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/features/hr-management/leaves/leave-requests/components/primitives/ui";

type FieldErrors = Record<string, string>;

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: FieldErrors = {};
  for (const issue of issues)
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  return result;
}

const today = () => new Date().toISOString().slice(0, 10);

export function LeaveRequestForm({
  record,
  notify,
  onClose,
}: {
  record?: LeaveDto;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    employeeId: record?.employeeId ?? "",
    employeeName: record?.employeeName ?? "",
    leaveType: (record?.leaveType ?? "ANNUAL") as LeaveType,
    fromDate: record?.fromDate ?? today(),
    toDate: record?.toDate ?? today(),
    reason: record?.reason ?? "",
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
          leaveType: values.leaveType,
          fromDate: values.fromDate,
          toDate: values.toDate,
          reason: values.reason,
        });
        leaveRequestsChanged();
        notify("Đã cập nhật đơn nghỉ phép.");
        onClose();
      } catch (cause) {
        setFailure(
          cause instanceof Error
            ? cause.message
            : "Không thể lưu đơn nghỉ phép",
        );
      } finally {
        setPending(false);
      }
      return;
    }
    const parsed = leaveInput.safeParse(values);
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await client.create(parsed.data);
      leaveRequestsChanged();
      notify("Đã gửi đơn nghỉ phép.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể gửi đơn nghỉ phép",
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
      <Field label="Loại nghỉ">
        <Select
          value={values.leaveType}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              leaveType: event.target.value as LeaveType,
            }))
          }
        >
          {Object.entries(leaveTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
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
      <Field
        label="Lý do"
        error={errors.reason}
        hint="Số ngày làm việc được tính tự động, bỏ qua thứ bảy và chủ nhật."
      >
        <Textarea
          value={values.reason}
          onChange={(event) =>
            setValues((current) => ({ ...current, reason: event.target.value }))
          }
          maxLength={1000}
          required
          aria-invalid={Boolean(errors.reason)}
        />
      </Field>
      <footer className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Gửi đơn"}
        </Button>
      </footer>
    </form>
  );
}
