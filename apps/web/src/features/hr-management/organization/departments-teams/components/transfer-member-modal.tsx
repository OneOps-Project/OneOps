"use client";

import { useState, type FormEvent } from "react";
import { client } from "@/features/hr-management/organization/departments-teams/api/client";
import { AccountMultiSelect } from "@/features/hr-management/organization/departments-teams/components/primitives/account-multi-select";
// TODO: [INTEGRATION] - Replace mock account choices with the Accounts API.
import { useMockAccounts } from "@/features/hr-management/organization/departments-teams/hooks/use-mock-accounts";
import {
  transferInputSchema,
  type Team,
  type TransferPreview,
} from "@/features/hr-management/organization/departments-teams/types";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export function TransferMemberModal({
  team,
  onClose,
  onTransferred,
}: {
  team: Team;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [userIds, setUserIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const accounts = useMockAccounts();

  async function loadPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setPreview(null);
    try {
      const input = transferInputSchema.parse({
        targetTeamId: team.id,
        userIds,
      });
      setPreview(await client.previewTransfer(team.id, input));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể kiểm tra Team hiện tại.",
      );
    } finally {
      setPending(false);
    }
  }

  async function confirmTransfer() {
    if (!preview || pending) return;
    setPending(true);
    setError("");
    try {
      await client.transfer(team.id, {
        targetTeamId: team.id,
        userIds: preview.transfers
          .filter((entry) => entry.willTransfer)
          .map((entry) => entry.userId),
      });
      onTransferred();
      onClose();
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
    <div className={styles.form}>
      <form className={styles.form} onSubmit={loadPreview}>
        <div className={styles.field}>
          <AccountMultiSelect
            id="transfer-user-ids"
            label="Nhân viên cần chuyển"
            accounts={accounts.users}
            required
            selectedIds={userIds}
            onChange={(ids) => {
              setUserIds(ids);
              setPreview(null);
            }}
          />
        </div>
        {accounts.loading && <p role="status">Đang tải nhân viên mẫu…</p>}
        {accounts.error && (
          <div className={styles.error} role="alert">
            {accounts.error}
          </div>
        )}
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          type="submit"
          disabled={pending}
        >
          {pending ? "Đang kiểm tra…" : "Kiểm tra & xem trước"}
        </button>
      </form>

      {preview && (
        <div className={styles.form}>
          <h3>Chuyển nhân viên vào {preview.targetTeamName}</h3>
          {preview.transfers.map((entry) => (
            <div className={styles.callout} key={entry.userId}>
              {entry.oldTeamName ? (
                <p>
                  Nhân viên đang thuộc{" "}
                  {entry.oldTeamName.startsWith("Team ")
                    ? entry.oldTeamName
                    : `Team ${entry.oldTeamName}`}
                  , xác nhận chuyển sẽ gỡ nhân viên khỏi Team cũ và bàn giao lại
                  Task.
                </p>
              ) : (
                <p>
                  Nhân viên chưa thuộc Team nào; sẽ được thêm vào Team đích.
                </p>
              )}
              <small>{entry.userId}</small>
            </div>
          ))}
          <p className={styles.muted}>
            Bàn giao Task cần listener từ module Tasks; hiện tại API chỉ phát sự
            kiện chuyển Team.
          </p>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={
              pending || preview.transfers.every((entry) => !entry.willTransfer)
            }
            onClick={() => void confirmTransfer()}
          >
            {pending ? "Đang chuyển…" : "Xác nhận chuyển"}
          </button>
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.button}
          onClick={onClose}
          disabled={pending}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
