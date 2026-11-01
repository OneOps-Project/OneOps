"use client";
import { MyTasksPage } from "@/features/work-management/work/tasks/components/my-tasks-page";
import { WorkspaceProvider } from "@/features/work-management/work/tasks/components/primitives/workspace";

export default function Page() {
  return (
    <WorkspaceProvider
      renderCreate={() => null}
      onNotify={(message) => {
        console.log("Notification:", message);
      }}
    >
      <MyTasksPage />
    </WorkspaceProvider>
  );
}
