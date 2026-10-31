"use client";
import { ModulePage as Content } from "@/features/hr-management/leaves/leave-requests/components/page";
import { LeaveRequestForm } from "@/features/hr-management/leaves/leave-requests/components/request-form";

export function ModulePage() {
  return <Content />;
}

export function CreateForm({
  onClose,
  onNotify,
}: {
  onClose: () => void;
  onNotify?: (message: string) => void;
}) {
  return (
    <LeaveRequestForm
      notify={onNotify ?? (() => undefined)}
      onClose={onClose}
    />
  );
}
