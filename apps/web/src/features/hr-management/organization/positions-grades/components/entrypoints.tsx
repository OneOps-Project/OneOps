"use client";
import { ModulePage as Content } from "@/features/hr-management/organization/positions-grades/components/page";
import { RecordForm } from "@/features/hr-management/organization/positions-grades/components/record-form";
import {
  WorkspaceProvider,
  Modal,
} from "@/features/hr-management/organization/positions-grades/components/primitives/workspace";

export function ModulePage({
  initialView = "table",
}: {
  initialView?: "table" | "grid";
}) {
  return (
    <WorkspaceProvider
      renderCreate={(close, scope) => (
        <Modal
          title={
            scope === "designation"
              ? "Tạo mới Chức vụ quản lý"
              : scope === "grade"
                ? "Tạo mới Cấp bậc nhân sự"
                : "Tạo mới Chức danh nghề nghiệp"
          }
          onClose={close}
        >
          <RecordForm onClose={close} defaultScope={scope} />
        </Modal>
      )}
    >
      <Content initialView={initialView} />
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
      <RecordForm onClose={onClose} />
    </WorkspaceProvider>
  );
}

