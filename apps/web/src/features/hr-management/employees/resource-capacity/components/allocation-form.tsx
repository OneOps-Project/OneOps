"use client";
import { useState } from "react";
import {
  allocationInput,
  allocationStatusSchema,
  type AllocationDto,
  type AllocationStatus,
  type PeriodDto,
} from "@/features/hr-management/employees/resource-capacity/types";
import { allocationStatusLabels } from "@/features/hr-management/employees/resource-capacity/constants";
import { client } from "@/features/hr-management/employees/resource-capacity/api/client";
import { capacityChanged } from "@/features/hr-management/employees/resource-capacity/hooks/use-capacity";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/features/hr-management/employees/resource-capacity/components/primitives/ui";

type FieldErrors = Record<string, string>;

function errorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const result: FieldErrors = {};
  for (const issue of issues)
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  return result;
}

export function AllocationForm({
  record,
  periods,
  initialPeriodId,
  notify,
  onClose,
}: {
  record?: AllocationDto;
  periods: PeriodDto[];
  initialPeriodId?: string;
  notify: (message: string) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    periodId: record?.periodId ?? initialPeriodId ?? periods[0]?.id ?? "",
    projectRef: record?.projectRef ?? "",
    percentage: String(record?.percentage ?? 100),
    status: (record?.status ?? "PLANNED") as AllocationStatus,
    note: record?.note ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFailure("");
    const percentage = Number(values.percentage);
    const parsed = allocationInput.safeParse({ ...values, percentage });
    if (!parsed.success) {
      setErrors(errorsOf(parsed.error.issues));
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (record)
        await client.updateAllocation(record, {
          projectRef: parsed.data.projectRef,
          percentage: parsed.data.percentage,
          status: parsed.data.status,
          note: parsed.data.note,
        });
      else await client.createAllocation(parsed.data);
      capacityChanged();
      notify(record ? "Đã cập nhật phân bổ dự án." : "Đã thêm phân bổ dự án.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu phân bổ dự án",
      );
    } finally {
      setPending(false);
    }
  }

  const statuses = allocationStatusSchema.options;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}
      <Field label="Kỳ công suất" error={errors.periodId}>
        <Select
          value={values.periodId}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              periodId: event.target.value,
            }))
          }
          disabled={Boolean(record)}
          required
          aria-invalid={Boolean(errors.periodId)}
        >
          <option value="">Chọn kỳ công suất</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.employeeName} · {period.fromDate} → {period.toDate}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Dự án" error={errors.projectRef}>
        <Input
          value={values.projectRef}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              projectRef: event.target.value,
            }))
          }
          maxLength={200}
          required
          aria-invalid={Boolean(errors.projectRef)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Tỷ lệ phân bổ (%)"
          error={errors.percentage}
          hint="Quá 100% sẽ cảnh báo quá tải, không chặn."
        >
          <Input
            type="number"
            min={0}
            max={200}
            step={5}
            value={values.percentage}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                percentage: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.percentage)}
          />
        </Field>
        <Field label="Trạng thái" error={errors.status}>
          <Select
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                status: event.target.value as AllocationStatus,
              }))
            }
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {allocationStatusLabels[status]}
              </option>
            ))}
          </Select>
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
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Thêm phân bổ"}
        </Button>
      </footer>
    </form>
  );
}
