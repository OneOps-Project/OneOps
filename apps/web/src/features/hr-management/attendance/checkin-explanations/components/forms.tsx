"use client";
import { useState } from "react";
import {
  explanationInput,
  type ExplanationDto,
  type ExplanationType,
} from "@/features/hr-management/attendance/checkin-explanations/types";
import { typeLabels } from "@/features/hr-management/attendance/checkin-explanations/constants";
import { client } from "@/features/hr-management/attendance/checkin-explanations/api/client";
import { explanationsChanged } from "@/features/hr-management/attendance/checkin-explanations/hooks/use-explanations";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/features/hr-management/attendance/checkin-explanations/components/primitives/ui";

type FieldErrors = Record<string, string>;

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: FieldErrors = {};
  for (const issue of issues)
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  return result;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ExplanationForm({
  record,
  notify,
  onClose,
}: {
  record?: ExplanationDto;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    employeeId: record?.employeeId ?? "",
    employeeName: record?.employeeName ?? "",
    workDate: record?.workDate ?? today(),
    type: (record?.type ?? "FORGOT_CHECKIN") as ExplanationType,
    reason: record?.reason ?? "",
    requestedCheckIn: record?.requestedCheckIn ?? "",
    requestedCheckOut: record?.requestedCheckOut ?? "",
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
          reason: values.reason,
          type: values.type,
          requestedCheckIn: values.requestedCheckIn,
          requestedCheckOut: values.requestedCheckOut,
        });
        explanationsChanged();
        notify("Đã cập nhật đơn giải trình.");
        onClose();
      } catch (cause) {
        setFailure(
          cause instanceof Error
            ? cause.message
            : "Không thể lưu đơn giải trình",
        );
      } finally {
        setPending(false);
      }
      return;
    }
    const parsed = explanationInput.safeParse(values);
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await client.create(parsed.data);
      explanationsChanged();
      notify("Đã gửi đơn giải trình.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể gửi đơn giải trình",
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
      <Field label="Loại giải trình">
        <Select
          value={values.type}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              type: event.target.value as ExplanationType,
            }))
          }
        >
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Giờ vào đề nghị" error={errors.requestedCheckIn}>
          <Input
            type="time"
            value={values.requestedCheckIn}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                requestedCheckIn: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Giờ ra đề nghị" error={errors.requestedCheckOut}>
          <Input
            type="time"
            value={values.requestedCheckOut}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                requestedCheckOut: event.target.value,
              }))
            }
          />
        </Field>
      </div>
      <Field
        label="Nội dung giải trình"
        error={errors.reason}
        hint="Nêu rõ lý do và minh chứng để quản lý đối chiếu."
      >
        <Textarea
          value={values.reason}
          onChange={(event) =>
            setValues((current) => ({ ...current, reason: event.target.value }))
          }
          rows={4}
          maxLength={1000}
          required
          aria-invalid={Boolean(errors.reason)}
        />
      </Field>
      <footer className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Gửi đơn"}
        </Button>
      </footer>
    </form>
  );
}

export function DecisionForm({
  record,
  decision,
  notify,
  onClose,
}: {
  record: ExplanationDto;
  decision: "APPROVED" | "REJECTED";
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    setPending(true);
    try {
      await client.decide(record, { status: decision, note });
      explanationsChanged();
      notify(
        decision === "APPROVED"
          ? "Đã duyệt đơn giải trình."
          : "Đã từ chối đơn giải trình.",
      );
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : "Không thể xử lý đơn giải trình",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}
      <p className="text-sm">
        {decision === "APPROVED" ? "Duyệt" : "Từ chối"} đơn giải trình của{" "}
        {record.employeeName} ngày {record.workDate}.
      </p>
      <Field label="Ghi chú quyết định">
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={500}
        />
      </Field>
      <footer className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button
          type="submit"
          variant={decision === "APPROVED" ? "primary" : "destructive"}
          disabled={pending}
        >
          {pending
            ? "Đang xử lý…"
            : decision === "APPROVED"
              ? "Duyệt"
              : "Từ chối"}
        </Button>
      </footer>
    </form>
  );
}
