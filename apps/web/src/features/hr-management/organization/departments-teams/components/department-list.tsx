"use client";

import Link from "next/link";
import { useState } from "react";
import { client } from "@/features/hr-management/organization/departments-teams/api/client";
// TODO: [INTEGRATION] - Replace mock ID-to-name lookups with Accounts API data.
import { useMockAuth } from "@/features/hr-management/organization/departments-teams/contexts/MockAuthContext";
import { useDepartments } from "@/features/hr-management/organization/departments-teams/hooks/use-organization";
import { Modal } from "@/features/hr-management/organization/departments-teams/components/primitives/modal";
import { DepartmentForm } from "@/features/hr-management/organization/departments-teams/components/department-form";
import { Pagination } from "@/features/hr-management/organization/departments-teams/components/primitives/pagination";
import {
  accountName,
  mockUsers,
} from "@/features/hr-management/organization/departments-teams/api/mock-accounts";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";
import type {
  Department,
  OrganizationStatus,
} from "@/features/hr-management/organization/departments-teams/types";

export function DepartmentList() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"list" | "tree">("list");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [actionError, setActionError] = useState("");
  const auth = useMockAuth();
  const resource = useDepartments({
    q: query,
    status: status || undefined,
    page,
  });
  const showActions = resource.data.items.some((department) =>
    auth.canManageDepartment(department.administratorIds),
  );

  async function toggleStatus(department: Department) {
    const next: OrganizationStatus =
      department.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (
      next === "INACTIVE" &&
      !window.confirm(`Ngừng hoạt động phòng ban "${department.name}"?`)
    )
      return;
    setPendingId(department.id);
    setActionError("");
    try {
      await client.setDepartmentStatus(department.id, next);
      resource.reload();
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "Không thể cập nhật trạng thái.",
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <h1>Phòng ban & Team</h1>
          <p>Quản lý cấu trúc tổ chức, quyền truy cập và các Team.</p>
        </div>
        {auth.canCreateDepartment && (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => setCreating(true)}
          >
            Tạo phòng ban
          </button>
        )}
      </header>

      <section className={styles.panel} aria-label="Danh sách phòng ban">
        <div className={styles.toolbar}>
          <input
            className={styles.input}
            aria-label="Tìm phòng ban"
            placeholder="Tìm theo tên phòng ban"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          <select
            className={styles.select}
            aria-label="Lọc trạng thái phòng ban"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
          <span className={styles.muted}>{resource.data.total} phòng ban</span>
        </div>
        <div className={styles.tabs} role="group" aria-label="Kiểu hiển thị">
          <button
            type="button"
            className={`${styles.tab} ${view === "list" ? styles.tabActive : ""}`}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Danh sách
          </button>
          <button
            type="button"
            className={`${styles.tab} ${view === "tree" ? styles.tabActive : ""}`}
            aria-pressed={view === "tree"}
            onClick={() => setView("tree")}
          >
            Sơ đồ tổ chức
          </button>
        </div>

        {(resource.error || actionError) && (
          <div className={styles.error} role="alert">
            <p>{actionError || resource.error}</p>
            <button
              type="button"
              className={styles.button}
              onClick={resource.reload}
            >
              Thử lại
            </button>
          </div>
        )}
        {resource.loading ? (
          <p role="status">Đang tải phòng ban…</p>
        ) : resource.data.items.length === 0 ? (
          <div className={styles.empty}>
            <h2>Chưa có phòng ban phù hợp</h2>
            <p>
              {auth.canCreateDepartment
                ? "Thay đổi bộ lọc hoặc tạo phòng ban mới."
                : "Thay đổi bộ lọc để tìm phòng ban phù hợp."}
            </p>
          </div>
        ) : view === "tree" ? (
          <ul className={styles.organizationTree}>
            {resource.data.items.map((department) => (
              <li key={department.id}>
                <div>
                  <Link
                    href={`/hr-management/organization/departments/${department.id}`}
                  >
                    {department.name}
                  </Link>
                  <span className={styles.status}>
                    {department.status === "ACTIVE"
                      ? "Đang hoạt động"
                      : "Ngừng hoạt động"}
                  </span>
                </div>
                {department.teams.length > 0 && (
                  <ul>
                    {department.teams.map((team) => (
                      <li key={team.id}>
                        <Link
                          href={`/hr-management/organization/teams/${team.id}`}
                        >
                          {team.name}
                        </Link>
                        <span className={styles.status}>
                          {team.status === "ACTIVE"
                            ? "Đang hoạt động"
                            : "Ngừng hoạt động"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Phòng ban</th>
                  {!auth.isEmployee && <th scope="col">Số Team</th>}
                  <th scope="col">Quản trị viên</th>
                  <th scope="col">Trạng thái</th>
                  {showActions && <th scope="col">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((department) => (
                  <tr key={department.id}>
                    <td>
                      <Link
                        href={`/hr-management/organization/departments/${department.id}`}
                      >
                        {department.name}
                      </Link>
                    </td>
                    {!auth.isEmployee && <td>{department.teams.length}</td>}
                    <td>
                      {department.administratorIds
                        .map((id) => accountName(id, mockUsers))
                        .join(", ")}
                    </td>
                    <td>
                      <span className={styles.status}>
                        {department.status === "ACTIVE"
                          ? "Đang hoạt động"
                          : "Ngừng hoạt động"}
                      </span>
                    </td>
                    {showActions && (
                      <td>
                        {auth.canManageDepartment(
                          department.administratorIds,
                        ) && (
                          <button
                            type="button"
                            className={styles.button}
                            disabled={pendingId === department.id}
                            onClick={() => void toggleStatus(department)}
                          >
                            {department.status === "ACTIVE"
                              ? "Ngừng hoạt động"
                              : "Kích hoạt"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!resource.loading && (
          <Pagination
            page={resource.data.page}
            pageSize={resource.data.pageSize}
            total={resource.data.total}
            onPageChange={setPage}
          />
        )}
      </section>

      {creating && auth.canCreateDepartment && (
        <Modal title="Tạo phòng ban" onClose={() => setCreating(false)}>
          <DepartmentForm
            onClose={() => setCreating(false)}
            onSaved={resource.reload}
          />
        </Modal>
      )}
    </div>
  );
}
