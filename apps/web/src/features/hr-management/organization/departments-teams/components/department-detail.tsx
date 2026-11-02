"use client";

import Link from "next/link";
import { useState } from "react";
import { client } from "@/features/hr-management/organization/departments-teams/api/client";
// TODO: [INTEGRATION] - Replace mock ID-to-name lookups with Accounts API data.
import { useMockAuth } from "@/features/hr-management/organization/departments-teams/contexts/MockAuthContext";
import { DepartmentForm } from "@/features/hr-management/organization/departments-teams/components/department-form";
import { Modal } from "@/features/hr-management/organization/departments-teams/components/primitives/modal";
import { Pagination } from "@/features/hr-management/organization/departments-teams/components/primitives/pagination";
import { TeamForm } from "@/features/hr-management/organization/departments-teams/components/team-form";
import { HistoryList } from "@/features/hr-management/organization/departments-teams/components/history-list";
import {
  accountName,
  mockGroups,
  mockUsers,
} from "@/features/hr-management/organization/departments-teams/api/mock-accounts";
import {
  useDepartmentDetails,
  useDepartmentHistory,
  useTeams,
} from "@/features/hr-management/organization/departments-teams/hooks/use-organization";
import type {
  OrganizationStatus,
  Team,
} from "@/features/hr-management/organization/departments-teams/types";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

type Tab = "info" | "teams" | "projects" | "history";

export function DepartmentDetail({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>("info");
  const [editing, setEditing] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamPage, setTeamPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const auth = useMockAuth();
  const department = useDepartmentDetails(id);
  const teams = useTeams(id, { page: teamPage });
  const history = useDepartmentHistory(id, historyPage);

  async function toggleStatus() {
    const item = department.data;
    if (!item) return;
    const next: OrganizationStatus =
      item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (
      next === "INACTIVE" &&
      !window.confirm(`Ngừng hoạt động phòng ban "${item.name}"?`)
    )
      return;
    setPending(true);
    setActionError("");
    try {
      await client.setDepartmentStatus(id, next);
      department.reload();
      teams.reload();
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "Không thể cập nhật trạng thái.",
      );
    } finally {
      setPending(false);
    }
  }

  if (department.loading) return <p role="status">Đang tải phòng ban…</p>;
  if (department.error || !department.data)
    return (
      <div className={styles.error} role="alert">
        {department.error || "Không tìm thấy phòng ban."}
        <Link href="/hr-management/organization/departments">Quay lại</Link>
      </div>
    );

  const item = department.data;
  const canManageDepartment = auth.canManageDepartment(item.administratorIds);
  const canCreateTeam = auth.canCreateTeam(
    item.administratorIds,
    item.accessUserIds,
  );
  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Thông tin" },
    { id: "teams", label: "Teams" },
    { id: "projects", label: "Dự án" },
    { id: "history", label: "Lịch sử" },
  ];

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <p className={styles.muted}>
            <Link href="/hr-management/organization/departments">
              Phòng ban & Team
            </Link>
            {" / "}
            {item.name}
          </p>
          <h1>{item.name}</h1>
          <p>{item.description || "Chưa có mô tả."}</p>
        </div>
        {canManageDepartment && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={() => setEditing(true)}
            >
              Chỉnh sửa
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={pending}
              onClick={() => void toggleStatus()}
            >
              {item.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}
            </button>
          </div>
        )}
      </header>

      {actionError && (
        <div className={styles.error} role="alert">
          {actionError}
        </div>
      )}
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Thông tin phòng ban"
      >
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={`${styles.tab} ${tab === entry.id ? styles.tabActive : ""}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <section role="tabpanel" className={styles.panel}>
        {tab === "info" && (
          <div className={styles.detailsGrid}>
            <Detail label="Trạng thái">
              {item.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
            </Detail>
            <Detail label="Quản trị viên">
              {item.administratorIds
                .map((id) => accountName(id, mockUsers))
                .join(", ")}
            </Detail>
            <Detail label="Nhân viên được xem">
              {item.accessUserIds
                .map((id) => accountName(id, mockUsers))
                .join(", ") || "—"}
            </Detail>
            <Detail label="Nhóm được xem">
              {item.accessGroupIds
                .map((id) => accountName(id, mockGroups))
                .join(", ") || "—"}
            </Detail>
            <Detail label="Ngày tạo">
              {new Date(item.createdAt).toLocaleString("vi-VN")}
            </Detail>
          </div>
        )}
        {tab === "teams" && (
          <>
            <div className={styles.listRow}>
              <h2>Teams thuộc phòng ban</h2>
              {canCreateTeam && (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={item.status !== "ACTIVE"}
                  onClick={() => setCreatingTeam(true)}
                >
                  Tạo Team
                </button>
              )}
            </div>
            {(teams.error || actionError) && (
              <div className={styles.error} role="alert">
                {teams.error || actionError}
                <button
                  type="button"
                  className={styles.button}
                  onClick={teams.reload}
                >
                  Thử lại
                </button>
              </div>
            )}
            {teams.loading ? (
              <p role="status">Đang tải Teams…</p>
            ) : teams.data.items.length === 0 ? (
              <div className={styles.empty}>Phòng ban chưa có Team.</div>
            ) : (
              <TeamTable teams={teams.data.items} />
            )}
            {!teams.loading && (
              <Pagination
                page={teams.data.page}
                pageSize={teams.data.pageSize}
                total={teams.data.total}
                onPageChange={setTeamPage}
              />
            )}
          </>
        )}
        {tab === "projects" && (
          <div className={styles.callout}>
            Chưa thể hiển thị Projects: module Projects hiện chưa liên kết dữ
            liệu với Department. Phần này cần tích hợp theo thiết kế liên miền.
          </div>
        )}
        {tab === "history" && (
          <HistoryList
            entries={history.data}
            loading={history.loading}
            error={history.error}
            onRetry={history.reload}
            onPageChange={setHistoryPage}
          />
        )}
      </section>

      {editing && canManageDepartment && (
        <Modal title="Chỉnh sửa phòng ban" onClose={() => setEditing(false)}>
          <DepartmentForm
            department={item}
            canManage={canManageDepartment}
            onClose={() => setEditing(false)}
            onSaved={department.reload}
          />
        </Modal>
      )}
      {creatingTeam && canCreateTeam && (
        <Modal title="Tạo Team" onClose={() => setCreatingTeam(false)}>
          <TeamForm
            departmentId={id}
            onClose={() => setCreatingTeam(false)}
            onSaved={teams.reload}
          />
        </Modal>
      )}
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <strong>{label}</strong>
      <p>{children || "—"}</p>
    </div>
  );
}

function TeamTable({ teams }: { teams: Team[] }) {
  const auth = useMockAuth();
  const visibleTeams = auth.isEmployee
    ? teams.filter((team) => team.memberUserIds.includes(auth.user?.id ?? ""))
    : teams;
  if (visibleTeams.length === 0)
    return <div className={styles.empty}>Bạn chưa thuộc Team nào.</div>;
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Quản lý</th>
            <th scope="col">Thành viên</th>
            <th scope="col">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {visibleTeams.map((team) => (
            <tr key={team.id}>
              <td>
                <Link href={`/hr-management/organization/teams/${team.id}`}>
                  {team.name}
                </Link>
              </td>
              <td>
                {team.managerIds
                  .map((id) => accountName(id, mockUsers))
                  .join(", ")}
              </td>
              <td>{team.memberUserIds.length}</td>
              <td>
                <span className={styles.status}>
                  {team.status === "ACTIVE"
                    ? "Đang hoạt động"
                    : "Ngừng hoạt động"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
