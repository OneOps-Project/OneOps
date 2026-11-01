"use client";
import { ModulePage as Content } from "@/features/work-management/work/tasks/components/page";
import { RecordForm } from "@/features/work-management/work/tasks/components/record-form";
import { MyTasksPage } from "@/features/work-management/work/tasks/components/my-tasks-page";
import { FlaggedTasksPage } from "@/features/work-management/work/tasks/components/flagged-tasks-page";
import {
  WorkspaceProvider,
  Modal,
} from "@/features/work-management/work/tasks/components/primitives/workspace";

export function ModulePage({
  initialView = "list",
}: {
  initialView?: "list" | "board";
}) {
  return (
    <WorkspaceProvider
      renderCreate={(close) => (
        <Modal title="Tạo công việc mới" onClose={close}>
          <RecordForm onClose={close} />
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

export function MyTasksView() {
  return (
    <WorkspaceProvider renderCreate={() => null}>
      <MyTasksPage />
    </WorkspaceProvider>
  );
}

export function FlaggedTasksView() {
  return (
    <WorkspaceProvider renderCreate={() => null}>
      <FlaggedTasksPage />
    </WorkspaceProvider>
  );
}

