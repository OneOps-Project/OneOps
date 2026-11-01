"use client";

import Link from "next/link";
import { useState } from "react";
import { client } from "@/features/hr-management/organization/departments-teams/api/client";
// TODO: [INTEGRATION] - Replace mock ID-to-name lookups with Accounts API data.
import { useMockAuth } from "@/features/hr-management/organization/departments-teams/contexts/MockAuthContext";
import { Modal } from "@/features/hr-management/organization/departments-teams/components/primitives/modal";
import { TeamForm } from "@/features/hr-management/organization/departments-teams/components/team-form";
import { TransferMemberModal } from "@/features/hr-management/organization/departments-teams/components/transfer-member-modal";
import { HistoryList } from "@/features/hr-management/organization/departments-teams/components/history-list";
import {
  accountName,
  mockGroups,
  mockUsers,
} from "@/features/hr-management/organization/departments-teams/api/mock-accounts";
import {
  useTeamDetails,
  useTeamHistory,
} from "@/features/hr-management/organization/departments-teams/hooks/use-organization";
import type { OrganizationStatus } from "@/features/hr-management/organization/departments-teams/types";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

type Tab = "info" | "members" | "kanban" | "history";

export function TeamDetail({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>("info");
  const [editing, setEditing] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const auth = useMockAuth();
  const team = useTeamDetails(id);
  const history = useTeamHistory(id, historyPage);

  async function toggleStatus() {
    const item = team.data;
    if (!item) return;
    const next: OrganizationStatus =
      item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (
      next === "INACTIVE" &&
      !window.confirm(`Ngừng hoạt động Team "${item.name}"?`)
    )
      return;
    setPending(true);
    setActionError("");
    try {
      await client.setTeamStatus(id, next);
      team.reload();
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

  if (team.loading) return <p role="status">Đang tải Team…</p>;
  if (team.error || !team.data)
    return (
      <div className={styles.error} role="alert">
        {team.error || "Không tìm thấy Team."}{" "}
        <Link href="/hr-management/organization/departments">Quay lại</Link>
      </div>
    );

  const item = team.data;
  const canManageTeam = auth.canManageTeam(
    item.managerIds,
    item.department.administratorIds,
  );
  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Thông tin" },
    { id: "members", label: "Thành viên" },
    { id: "kanban", label: "Kanban" },
    { id: "history", label: "Lịch sử" },
  ];

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <p className={styles.muted}>
            <Link
              href={`/hr-management/organization/departments/${item.departmentId}`}
            >
              {item.department.name}
            </Link>
            {" / "}
            {item.name}
          </p>
          <h1>{item.name}</h1>
          <p>{item.description || "Chưa có mô tả."}</p>
        </div>
        {canManageTeam && (
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
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={item.status !== "ACTIVE"}
              onClick={() => setTransferring(true)}
            >
              Chuyển nhân viên
            </button>
          </div>
        )}
      </header>
      {actionError && (
        <div className={styles.error} role="alert">
          {actionError}
        </div>
      )}
      <div className={styles.tabs} role="tablist" aria-label="Thông tin Team">
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
            <Detail label="Phòng ban">
              <Link
                href={`/hr-management/organization/departments/${item.departmentId}`}
              >
                {item.department.name}
              </Link>
            </Detail>
            <Detail label="Trạng thái">
              {item.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
            </Detail>
            <Detail label="Quản lý">
              {item.managerIds
                .map((userId) => accountName(userId, mockUsers))
                .join(", ")}
            </Detail>
            <Detail label="Nhóm">
              {item.memberGroupIds
                .map((groupId) => accountName(groupId, mockGroups))
                .join(", ") || "—"}
            </Detail>
            <Detail label="Ngày tạo">
              {new Date(item.createdAt).toLocaleString("vi-VN")}
            </Detail>
          </div>
        )}
        {tab === "members" && (
          <>
            <h2>Nhân viên ({item.memberUserIds.length})</h2>
            {item.memberUserIds.length === 0 ? (
              <div className={styles.empty}>Team chưa có thành viên.</div>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">UUID tài khoản</th>
                      <th scope="col">Vai trò trong Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.memberUserIds.map((userId) => (
                      <tr key={userId}>
                        <td>{accountName(userId, mockUsers)}</td>
                        <td>
                          {item.managerIds.includes(userId)
                            ? "Quản lý"
                            : "Thành viên"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {tab === "kanban" && (
          <div className={styles.callout}>
            Bảng Kanban của Team chưa thể tải vì Work Management chưa có quan hệ
            Team–Task.{" "}
            <Link href="/work-management/tasks">Mở danh sách công việc</Link>
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

      {editing && canManageTeam && (
        <Modal title="Chỉnh sửa Team" onClose={() => setEditing(false)}>
          <TeamForm
            departmentId={item.departmentId}
            team={item}
            onClose={() => setEditing(false)}
            onSaved={team.reload}
          />
        </Modal>
      )}
      {transferring && canManageTeam && (
        <Modal title="Chuyển nhân viên" onClose={() => setTransferring(false)}>
          <TransferMemberModal
            team={item}
            onClose={() => setTransferring(false)}
            onTransferred={team.reload}
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
