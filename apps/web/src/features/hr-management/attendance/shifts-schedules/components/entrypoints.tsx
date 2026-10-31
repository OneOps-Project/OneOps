"use client";
import { ModulePage as Content } from "@/features/hr-management/attendance/shifts-schedules/components/page";
import { ShiftForm } from "@/features/hr-management/attendance/shifts-schedules/components/shift-forms";

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
  return <ShiftForm notify={onNotify ?? (() => undefined)} onClose={onClose} />;
}
