"use client";
import { ModulePage as Content } from "@/features/tenant-system/organization/work-policies/components/page";
import { HolidayForm } from "@/features/tenant-system/organization/work-policies/components/policy-forms";
import {
  Modal,
  WorkspaceProvider,
} from "@/features/tenant-system/organization/work-policies/components/primitives/workspace";

export function ModulePage() {
  return (
    <WorkspaceProvider
      renderCreate={(close) => (
        <Modal title="Thêm ngày lễ" onClose={close}>
          <HolidayForm onClose={close} />
        </Modal>
      )}
    >
      <Content />
    </WorkspaceProvider>
  );
}

export function CreateForm({
  onClose,
  onNotify,
}: {
  onClose: () => void;
  onNotify?: (message: string) => void;
}) {
  return (
    <WorkspaceProvider renderCreate={() => null} onNotify={onNotify}>
      <HolidayForm onClose={onClose} />
    </WorkspaceProvider>
  );
}
