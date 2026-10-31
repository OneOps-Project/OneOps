"use client";
import { ModulePage as Content } from "@/features/hr-management/attendance/attendance-reports/components/page";
import { PeriodForm } from "@/features/hr-management/attendance/attendance-reports/components/report-forms";

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
    <PeriodForm notify={onNotify ?? (() => undefined)} onClose={onClose} />
  );
}
