"use client";
import { ModulePage as Content } from "@/features/hr-management/attendance/workforce-board/components/page";
import { PresenceForm } from "@/features/hr-management/attendance/workforce-board/components/presence-form";

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
    <PresenceForm
      workDate={new Date().toISOString().slice(0, 10)}
      notify={onNotify ?? (() => undefined)}
      onClose={onClose}
    />
  );
}
