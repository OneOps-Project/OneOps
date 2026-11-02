"use client";

import { DepartmentForm } from "@/features/hr-management/organization/departments-teams/components/department-form";
import { ModulePage as Content } from "@/features/hr-management/organization/departments-teams/components/page";
import { MockAuthProvider } from "@/features/hr-management/organization/departments-teams/contexts/MockAuthContext";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export function ModulePage() {
  return (
    <MockAuthProvider>
      <Content />
    </MockAuthProvider>
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
    <MockAuthProvider showSwitcher={false} showWarning={false}>
      <div className={styles.createFormBody}>
        <DepartmentForm
          onClose={onClose}
          onSaved={() => onNotify?.("Đã tạo phòng ban.")}
        />
      </div>
    </MockAuthProvider>
  );
}
