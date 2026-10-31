"use client";
import { useState } from "react";
import type { z } from "zod";
import {
  holidayInput,
  networkInput,
  policyPatch,
  quotaInput,
  type HolidayDto,
  type NetworkDto,
  type PolicyDto,
  type QuotaDto,
  type Status,
} from "@/features/tenant-system/organization/work-policies/types";
import { client } from "@/features/tenant-system/organization/work-policies/api/client";
import { workPoliciesChanged } from "@/features/tenant-system/organization/work-policies/hooks/use-work-policies";
import {
  statusLabels,
  weekdayLabels,
} from "@/features/tenant-system/organization/work-policies/constants";
import { useWorkspace } from "@/features/tenant-system/organization/work-policies/components/primitives/workspace";
import { Button } from "@/features/tenant-system/organization/work-policies/components/primitives/button";
import {
  Input,
  Select,
  Textarea,
} from "@/features/tenant-system/organization/work-policies/components/primitives/forms";

type FieldErrors = Record<string, string>;

function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="text-xs text-muted-foreground">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: Status;
  onChange: (value: Status) => void;
}) {
  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value as Status)}
    >
      {Object.entries(statusLabels).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </Select>
  );
}

export function PolicyForm({ record }: { record: PolicyDto }) {
  const { notify } = useWorkspace();
  const [values, setValues] = useState({
    timezone: record.timezone,
    workStart: record.workStart,
    workEnd: record.workEnd,
    breakMinutes: record.breakMinutes,
    lateGraceMinutes: record.lateGraceMinutes,
    workDays: record.workDays,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  function toggleDay(day: number) {
    setValues((current) => ({
      ...current,
      workDays: current.workDays.includes(day)
        ? current.workDays.filter((item) => item !== day)
        : [...current.workDays, day].sort((left, right) => left - right),
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const parsed = policyPatch.safeParse({
      ...values,
      version: record.version,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFailure("");
    setPending(true);
    try {
      await client.updatePolicy(record, parsed.data);
      workPoliciesChanged();
      notify("Đã lưu chính sách làm việc.");
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu chính sách",
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Giờ bắt đầu" error={errors.workStart}>
          <Input
            type="time"
            value={values.workStart}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                workStart: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.workStart)}
          />
        </Field>
        <Field label="Giờ kết thúc" error={errors.workEnd}>
          <Input
            type="time"
            value={values.workEnd}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                workEnd: event.target.value,
              }))
            }
            required
            aria-invalid={Boolean(errors.workEnd)}
          />
        </Field>
        <Field label="Nghỉ giữa ca (phút)" error={errors.breakMinutes}>
          <Input
            type="number"
            min={0}
            max={240}
            value={values.breakMinutes}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                breakMinutes: Number(event.target.value),
              }))
            }
            aria-invalid={Boolean(errors.breakMinutes)}
          />
        </Field>
        <Field
          label="Ân hạn đi muộn (phút)"
          error={errors.lateGraceMinutes}
          hint="Số phút được phép trễ trước khi ghi nhận đi muộn."
        >
          <Input
            type="number"
            min={0}
            max={120}
            value={values.lateGraceMinutes}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                lateGraceMinutes: Number(event.target.value),
              }))
            }
            aria-invalid={Boolean(errors.lateGraceMinutes)}
          />
        </Field>
      </div>
      <Field label="Múi giờ" error={errors.timezone}>
        <Input
          value={values.timezone}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              timezone: event.target.value,
            }))
          }
          maxLength={64}
          required
        />
      </Field>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 font-medium">Ngày làm việc</legend>
        <div className="flex flex-wrap gap-3">
          {Object.entries(weekdayLabels).map(([key, label]) => {
            const day = Number(key);
            return (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={values.workDays.includes(day)}
                  onChange={() => toggleDay(day)}
                />
                {label}
              </label>
            );
          })}
        </div>
        {errors.workDays && (
          <span className="text-xs text-destructive" role="alert">
            {errors.workDays}
          </span>
        )}
      </fieldset>
      <footer className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu chính sách"}
        </Button>
      </footer>
    </form>
  );
}

function DecisionFooter({
  onClose,
  pending,
  label,
}: {
  onClose: () => void;
  pending: boolean;
  label: string;
}) {
  return (
    <footer className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>
        Hủy
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? "Đang lưu…" : label}
      </Button>
    </footer>
  );
}

export function HolidayForm({
  record,
  onClose,
}: {
  record?: HolidayDto;
  onClose: () => void;
}) {
  const { notify } = useWorkspace();
  const [values, setValues] = useState({
    date: record?.date ?? "",
    name: record?.name ?? "",
    paid: record?.paid ?? true,
    note: record?.note ?? "",
    status: (record?.status ?? "ACTIVE") as Status,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const parsed = holidayInput.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFailure("");
    setPending(true);
    try {
      if (record) await client.updateHoliday(record, parsed.data);
      else await client.createHoliday(parsed.data);
      workPoliciesChanged();
      notify(record ? "Đã cập nhật ngày lễ." : "Đã thêm ngày lễ.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu ngày lễ",
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
      <Field label="Ngày" error={errors.date}>
        <Input
          type="date"
          value={values.date}
          onChange={(event) =>
            setValues((current) => ({ ...current, date: event.target.value }))
          }
          required
          aria-invalid={Boolean(errors.date)}
        />
      </Field>
      <Field label="Tên ngày lễ" error={errors.name}>
        <Input
          value={values.name}
          onChange={(event) =>
            setValues((current) => ({ ...current, name: event.target.value }))
          }
          maxLength={200}
          required
          aria-invalid={Boolean(errors.name)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.paid}
          onChange={(event) =>
            setValues((current) => ({ ...current, paid: event.target.checked }))
          }
        />
        Ngày lễ có hưởng lương
      </label>
      <Field label="Trạng thái">
        <StatusSelect
          value={values.status}
          onChange={(value) =>
            setValues((current) => ({ ...current, status: value }))
          }
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
      <DecisionFooter
        onClose={onClose}
        pending={pending}
        label={record ? "Lưu thay đổi" : "Thêm ngày lễ"}
      />
    </form>
  );
}

export function NetworkForm({
  record,
  onClose,
}: {
  record?: NetworkDto;
  onClose: () => void;
}) {
  const { notify } = useWorkspace();
  const [values, setValues] = useState({
    label: record?.label ?? "",
    cidr: record?.cidr ?? "",
    note: record?.note ?? "",
    status: (record?.status ?? "ACTIVE") as Status,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const parsed = networkInput.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFailure("");
    setPending(true);
    try {
      if (record) await client.updateNetwork(record, parsed.data);
      else await client.createNetwork(parsed.data);
      workPoliciesChanged();
      notify(
        record ? "Đã cập nhật mạng văn phòng." : "Đã thêm mạng văn phòng.",
      );
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu mạng văn phòng",
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
      <Field label="Tên mạng" error={errors.label}>
        <Input
          value={values.label}
          onChange={(event) =>
            setValues((current) => ({ ...current, label: event.target.value }))
          }
          maxLength={150}
          required
          aria-invalid={Boolean(errors.label)}
        />
      </Field>
      <Field
        label="Dải mạng"
        error={errors.cidr}
        hint="Ví dụ 203.0.113.10 hoặc 203.0.113.0/24."
      >
        <Input
          value={values.cidr}
          onChange={(event) =>
            setValues((current) => ({ ...current, cidr: event.target.value }))
          }
          maxLength={64}
          required
          aria-invalid={Boolean(errors.cidr)}
        />
      </Field>
      <Field label="Trạng thái">
        <StatusSelect
          value={values.status}
          onChange={(value) =>
            setValues((current) => ({ ...current, status: value }))
          }
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
      <DecisionFooter
        onClose={onClose}
        pending={pending}
        label={record ? "Lưu thay đổi" : "Thêm mạng"}
      />
    </form>
  );
}

export function QuotaForm({
  record,
  onClose,
}: {
  record?: QuotaDto;
  onClose: () => void;
}) {
  const { notify } = useWorkspace();
  const currentYear = new Date().getFullYear();
  const [values, setValues] = useState({
    year: record?.year ?? currentYear,
    daysPerYear: record?.daysPerYear ?? 12,
    maxCarryOverDays: record?.maxCarryOverDays ?? 0,
    note: record?.note ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const parsed = quotaInput.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFailure("");
    setPending(true);
    try {
      if (record) await client.updateQuota(record, parsed.data);
      else await client.createQuota(parsed.data);
      workPoliciesChanged();
      notify(record ? "Đã cập nhật hạn mức phép." : "Đã thêm hạn mức phép.");
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể lưu hạn mức phép",
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
      <Field label="Năm" error={errors.year}>
        <Input
          type="number"
          min={2000}
          max={2100}
          value={values.year}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              year: Number(event.target.value),
            }))
          }
          aria-invalid={Boolean(errors.year)}
        />
      </Field>
      <Field label="Số ngày phép mỗi năm" error={errors.daysPerYear}>
        <Input
          type="number"
          min={0}
          max={366}
          value={values.daysPerYear}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              daysPerYear: Number(event.target.value),
            }))
          }
          aria-invalid={Boolean(errors.daysPerYear)}
        />
      </Field>
      <Field
        label="Số ngày tối đa chuyển sang năm sau"
        error={errors.maxCarryOverDays}
      >
        <Input
          type="number"
          min={0}
          max={366}
          value={values.maxCarryOverDays}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              maxCarryOverDays: Number(event.target.value),
            }))
          }
          aria-invalid={Boolean(errors.maxCarryOverDays)}
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
      <DecisionFooter
        onClose={onClose}
        pending={pending}
        label={record ? "Lưu thay đổi" : "Thêm hạn mức"}
      />
    </form>
  );
}
