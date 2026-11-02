"use client";

import { useState, type FormEvent } from "react";
import { client } from "@/features/hr-management/organization/departments-teams/api/client";
import { AccountMultiSelect } from "@/features/hr-management/organization/departments-teams/components/primitives/account-multi-select";
// TODO: [INTEGRATION] - Replace mock account choices with the Accounts API.
import { useMockAuth } from "@/features/hr-management/organization/departments-teams/contexts/MockAuthContext";
import { useMockAccounts } from "@/features/hr-management/organization/departments-teams/hooks/use-mock-accounts";
import type { Department } from "@/features/hr-management/organization/departments-teams/types";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export function DepartmentForm({
  department,
  canManage,
  onClose,
  onSaved,
}: {
  department?: Department;
  canManage?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [administratorIds, setAdministratorIds] = useState(
    department?.administratorIds ?? [],
  );
  const [accessUserIds, setAccessUserIds] = useState(
    department?.accessUserIds ?? [],
  );
  const [accessGroupIds, setAccessGroupIds] = useState(
    department?.accessGroupIds ?? [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const auth = useMockAuth();
  const accounts = useMockAccounts();
  const canSubmit = department
    ? (canManage ?? auth.canManageDepartment(department.administratorIds))
    : auth.canCreateDepartment;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !canSubmit) return;
    setPending(true);
    setError("");
    try {
      const input = {
        name,
        description,
        administratorIds,
        accessUserIds,
        accessGroupIds,
      };
      if (department) await client.updateDepartment(department.id, input);
      else await client.createDepartment(input);
      onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu.");
    } finally {
      setPending(false);
    }
  }

  if (!canSubmit)
    return (
      <p className={styles.error} role="status">
        Bạn không có quyền tạo hoặc chỉnh sửa phòng ban này.
      </p>
    );

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor="department-name">Tên phòng ban</label>
        <input
          id="department-name"
          className={styles.input}
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="department-description">Mô tả</label>
        <textarea
          id="department-description"
          className={styles.textarea}
          maxLength={1000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <AccountMultiSelect
        id="department-admins"
        label="Quản trị viên"
        required
        accounts={accounts.users}
        selectedIds={administratorIds}
        onChange={setAdministratorIds}
      />
      <AccountMultiSelect
        id="department-access-users"
        label="Nhân viên được xem"
        accounts={accounts.users}
        selectedIds={accessUserIds}
        onChange={setAccessUserIds}
      />
      <AccountMultiSelect
        id="department-access-groups"
        label="Nhóm được xem"
        accounts={accounts.groups}
        selectedIds={accessGroupIds}
        onChange={setAccessGroupIds}
      />
      {accounts.loading && <p role="status">Đang tải tài khoản mẫu…</p>}
      {accounts.error && (
        <div className={styles.error} role="alert">
          {accounts.error}
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <div className={styles.formActions}>
        <button
          className={styles.button}
          type="button"
          onClick={onClose}
          disabled={pending}
        >
          Hủy
        </button>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          type="submit"
          disabled={pending}
        >
          {pending ? "Đang lưu…" : "Lưu phòng ban"}
        </button>
      </div>
    </form>
  );
}
