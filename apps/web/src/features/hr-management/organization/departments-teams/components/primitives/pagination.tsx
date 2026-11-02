"use client";

import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Phân trang danh sách">
      <button
        type="button"
        className={styles.button}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Trước
      </button>
      <span aria-live="polite">
        Trang {page} / {pageCount}
      </span>
      <button
        type="button"
        className={styles.button}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Sau
      </button>
    </nav>
  );
}
