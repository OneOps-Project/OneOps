"use client";

import { useState, type FormEvent } from "react";
import { client } from "@/features/hr-management/organization/departments-teams/api/client";
import {
  accountName,
  mockUsers,
} from "@/features/hr-management/organization/departments-teams/api/mock-accounts";
import { AccountMultiSelect } from "@/features/hr-management/organization/departments-teams/components/primitives/account-multi-select";
// TODO: [INTEGRATION] - Replace mock account choices with the Accounts API.
import { useMockAccounts } from "@/features/hr-management/organization/departments-teams/hooks/use-mock-accounts";
import type {
  Team,
  TransferPreview,
} from "@/features/hr-management/organization/departments-teams/types";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export function TeamForm({
  departmentId,
  team,
  onClose,
  onSaved,
}: {
  departmentId: string;
  team?: Team;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [managerIds, setManagerIds] = useState(team?.managerIds ?? []);
  const [memberUserIds, setMemberUserIds] = useState(team?.memberUserIds ?? []);
  const [memberGroupIds, setMemberGroupIds] = useState(
    team?.memberGroupIds ?? [],
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [pendingTransfers, setPendingTransfers] = useState<
    TransferPreview["transfers"]
  >([]);
  const accounts = useMockAccounts();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      if (team) {
        const additions = memberUserIds.filter(
          (userId) => !team.memberUserIds.includes(userId),
        );
        if (additions.length) {
          const preview = await client.previewTransfer(team.id, {
            targetTeamId: team.id,
            userIds: additions,
          });
          const transfers = preview.transfers.filter(
            (entry) => entry.oldTeamId !== null,
          );
          if (transfers.length) {
            setPendingTransfers(transfers);
            return;
          }
        }
      } else if (memberUserIds.length) {
        const preview = await client.previewCreateTransfers(
          departmentId,
          memberUserIds,
        );
        const transfers = preview.transfers.filter(
          (entry) => entry.oldTeamId !== null,
        );
        if (transfers.length) {
          setPendingTransfers(transfers);
          return;
        }
      }
      await save([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu.");
    } finally {
      setPending(false);
    }
  }

  async function save(confirmTransferUserIds: string[]) {
    const fields = {
      name,
      description,
      managerIds,
      memberUserIds,
      memberGroupIds,
    };
    if (team)
      await client.updateTeam(team.id, {
        ...fields,
        ...(confirmTransferUserIds.length ? { confirmTransferUserIds } : {}),
      });
    else
      await client.createTeam({
        ...fields,
        departmentId,
        ...(confirmTransferUserIds.length ? { confirmTransferUserIds } : {}),
      });
    onSaved();
    onClose();
  }

  async function confirmTransfers() {
    if (pending || pendingTransfers.length === 0) return;
    setPending(true);
    setError("");
    try {
      await save(pendingTransfers.map((entry) => entry.userId));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể chuyển thành viên.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor="team-name">Tên Team</label>
        <input
          id="team-name"
          className={styles.input}
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="team-description">Mô tả</label>
        <textarea
          id="team-description"
          className={styles.textarea}
          maxLength={1000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <AccountMultiSelect
        id="team-managers"
        label="Quản lý Team"
        required
        accounts={accounts.users}
        selectedIds={managerIds}
        onChange={setManagerIds}
      />
      <AccountMultiSelect
        id="team-members"
        label="Nhân viên"
        accounts={accounts.users}
        selectedIds={memberUserIds}
        onChange={(ids) => {
          setMemberUserIds(ids);
          setPendingTransfers([]);
        }}
      />
      <AccountMultiSelect
        id="team-groups"
        label="Nhóm nhân viên"
        accounts={accounts.groups}
        selectedIds={memberGroupIds}
        onChange={setMemberGroupIds}
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
      {pendingTransfers.length > 0 && (
        <div className={styles.callout}>
          <h3>Xác nhận chuyển nhân viên</h3>
          {pendingTransfers.map((entry) => (
            <p key={entry.userId}>
              {accountName(entry.userId, mockUsers)} đang thuộc Team{" "}
              {entry.oldTeamName}; xác nhận chuyển sẽ gỡ khỏi Team cũ và bàn
              giao lại Task.
            </p>
          ))}
          <p>
            Task và thông báo chỉ được xử lý đầy đủ sau khi tích hợp module
            Tasks/Notifications.
          </p>
          <div className={styles.formActions}>
            <button
              className={styles.button}
              type="button"
              onClick={() => setPendingTransfers([])}
              disabled={pending}
            >
              Hủy chuyển
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              type="button"
              onClick={() => void confirmTransfers()}
              disabled={pending}
            >
              {pending ? "Đang chuyển…" : "Xác nhận chuyển"}
            </button>
          </div>
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
          {pending ? "Đang lưu…" : "Lưu Team"}
        </button>
      </div>
    </form>
  );
}
