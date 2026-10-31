"use client";
import { ModulePage as Content } from "@/features/hr-management/attendance/daily-checkin/components/page";
import { CheckinForm } from "@/features/hr-management/attendance/daily-checkin/components/checkin-form";

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
    <CheckinForm notify={onNotify ?? (() => undefined)} onClose={onClose} />
  );
}
