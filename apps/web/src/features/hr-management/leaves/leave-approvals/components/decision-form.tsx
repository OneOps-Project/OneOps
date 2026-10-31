"use client";
import { useState } from "react";
import type {
  DecisionStatus,
  QueueItem,
} from "@/features/hr-management/leaves/leave-approvals/types";
import { client } from "@/features/hr-management/leaves/leave-approvals/api/client";
import { leaveApprovalsChanged } from "@/features/hr-management/leaves/leave-approvals/hooks/use-approvals";
import {
  Button,
  Field,
  Textarea,
} from "@/features/hr-management/leaves/leave-approvals/components/primitives/ui";

export function DecisionForm({
  item,
  decision,
  notify,
  onClose,
}: {
  item: QueueItem;
  decision: DecisionStatus;
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
      await client.decide(item, { status: decision, note });
      leaveApprovalsChanged();
      notify(
        decision === "APPROVED"
          ? "Đã duyệt đơn nghỉ phép."
          : "Đã từ chối đơn nghỉ phép.",
      );
      onClose();
    } catch (cause) {
      setFailure(
        cause instanceof Error
          ? cause.message
          : "Không thể xử lý đơn nghỉ phép",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm">
        {item.employeeName} nghỉ {item.days} ngày làm việc từ {item.fromDate}{" "}
        đến {item.toDate}.
      </p>
      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}
      <Field
        label="Ghi chú quyết định"
        hint="Tối đa 500 ký tự, không bắt buộc."
      >
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
        />
      </Field>
      <footer className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button
          type="submit"
          variant={decision === "REJECTED" ? "destructive" : "primary"}
          disabled={pending}
        >
          {pending
            ? "Đang xử lý…"
            : decision === "APPROVED"
              ? "Duyệt đơn"
              : "Từ chối"}
        </Button>
      </footer>
    </form>
  );
}
