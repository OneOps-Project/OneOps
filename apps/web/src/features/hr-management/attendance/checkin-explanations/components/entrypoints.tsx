"use client";
import { ModulePage as Content } from "@/features/hr-management/attendance/checkin-explanations/components/page";
import { ExplanationForm } from "@/features/hr-management/attendance/checkin-explanations/components/forms";

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
    <ExplanationForm notify={onNotify ?? (() => undefined)} onClose={onClose} />
  );
}
