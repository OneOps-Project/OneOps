"use client";

import type {
  HistoryEntry,
  PageResult,
} from "@/features/hr-management/organization/departments-teams/types";
import { Pagination } from "@/features/hr-management/organization/departments-teams/components/primitives/pagination";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export type HistoryListProps = {
  entries: PageResult<HistoryEntry>;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onPageChange: (page: number) => void;
};

export function HistoryList({
  entries,
  loading,
  error,
  onRetry,
  onPageChange,
}: HistoryListProps) {
  if (loading) return <p role="status">Đang tải lịch sử…</p>;
  if (error)
    return (
      <div role="alert" className={styles.error}>
        {error}{" "}
        <button type="button" className={styles.button} onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  if (!entries.items.length)
    return <div className={styles.empty}>Chưa có lịch sử.</div>;
  return (
    <>
      <div className={styles.historyList}>
        {entries.items.map((entry) => (
          <article className={styles.historyItem} key={entry.id}>
            <strong>{historyAction(entry.action)}</strong>
            <p className={styles.muted}>
              {new Date(entry.createdAt).toLocaleString("vi-VN")} · Người thực
              hiện: {entry.performedBy}
            </p>
            {entry.oldValue !== null && (
              <pre>{JSON.stringify(entry.oldValue, null, 2)}</pre>
            )}
            {entry.newValue !== null && (
              <pre>{JSON.stringify(entry.newValue, null, 2)}</pre>
            )}
          </article>
        ))}
      </div>
      <Pagination
        page={entries.page}
        pageSize={entries.pageSize}
        total={entries.total}
        onPageChange={onPageChange}
      />
    </>
  );
}

function historyAction(action: HistoryEntry["action"]) {
  return {
    CREATE: "Tạo mới",
    UPDATE: "Cập nhật",
    DEACTIVATE: "Ngừng hoạt động",
    TRANSFER: "Chuyển Team",
  }[action];
}
