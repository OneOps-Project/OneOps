"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  AccountDto,
  AccountRole,
  AccountStatus,
} from "@/features/tenant-system/access-control/accounts/types";
import {
  definition,
  roleLabels,
  statusLabels,
} from "@/features/tenant-system/access-control/accounts/constants";
import { useAccounts } from "@/features/tenant-system/access-control/accounts/hooks/use-accounts";
import { Modal } from "@/features/tenant-system/access-control/accounts/components/primitives/workspace";
import { Button } from "@/features/tenant-system/access-control/accounts/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/tenant-system/access-control/accounts/components/primitives/forms";
import { Badge } from "@/features/tenant-system/access-control/accounts/components/primitives/foundations";
import { AccountForm } from "@/features/tenant-system/access-control/accounts/components/account-form";
import { AccessDialog } from "@/features/tenant-system/access-control/accounts/components/access-dialog";
import { PasswordDialog } from "@/features/tenant-system/access-control/accounts/components/password-dialog";
import { HistoryDialog } from "@/features/tenant-system/access-control/accounts/components/history-dialog";
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
function AccountBadges({ record }: { record: AccountDto }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge variant={record.role === "MANAGER" ? "brand" : "neutral"}>
        {roleLabels[record.role]}
      </Badge>
      {record.isSystemAdmin && <Badge variant="warning">Quản trị</Badge>}
      <Badge variant={record.status === "ACTIVE" ? "success" : "danger"} dot>
        {statusLabels[record.status]}
      </Badge>
    </span>
  );
}
export function ModulePage() {
  const params = useSearchParams();
  const { accounts, loading, error, reload } = useAccounts();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AccountRole | "ALL">(
    params.get("role") === "MANAGER" || params.get("role") === "EMPLOYEE"
      ? (params.get("role") as AccountRole)
      : "ALL",
  );
  const [status, setStatus] = useState<AccountStatus | "ALL">(
    params.get("status") === "ACTIVE" || params.get("status") === "LOCKED"
      ? (params.get("status") as AccountStatus)
      : "ALL",
  );
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AccountDto | null>(null);
  const [changingAccess, setChangingAccess] = useState<AccountDto | null>(null);
  const [resetting, setResetting] = useState<AccountDto | null>(null);
  const [viewingHistory, setViewingHistory] = useState<AccountDto | null>(null);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi");
    return accounts.filter(
      (item) =>
        (role === "ALL" || item.role === role) &&
        (status === "ALL" || item.status === status) &&
        (!term ||
          `${item.username} ${item.displayName} ${item.email} ${item.employeeCode}`
            .toLocaleLowerCase("vi")
            .includes(term)),
    );
  }, [accounts, query, role, status]);
  const managers = accounts.filter((item) => item.role === "MANAGER").length;
  const locked = accounts.filter((item) => item.status === "LOCKED").length;
  const openAccess = (record: AccountDto) => setChangingAccess(record);
  const actions = (record: AccountDto) => (
    <div className="flex flex-wrap justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => setEditing(record)}>
        Sửa
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openAccess(record)}
        aria-label={`Phân quyền ${record.username}`}
      >
        Phân quyền
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setResetting(record)}
        aria-label={`Đặt lại mật khẩu ${record.username}`}
      >
        Mật khẩu
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewingHistory(record)}
        aria-label={`Lịch sử quyền ${record.username}`}
      >
        Lịch sử
      </Button>
    </div>
  );
  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="page-header">
          <div>
            <span className="eyebrow">Hệ thống · Truy cập</span>
            <h1>{definition.title}</h1>
            <p>
              Chỉ có hai vai trò Nhân viên và Quản lý; chức danh không cấp
              quyền. Mọi thay đổi quyền đều được lưu lịch sử.
            </p>
          </div>
          <div className="page-actions">
            <Button onClick={() => setCreating(true)}>Thêm tài khoản</Button>
          </div>
        </div>

        <dl className="metric-strip">
          <div className="metric">
            <dt>Tổng tài khoản</dt>
            <dd>{accounts.length}</dd>
          </div>
          <div className="metric">
            <dt>Quản lý</dt>
            <dd>{managers}</dd>
          </div>
          <div className="metric">
            <dt>Đã khóa</dt>
            <dd>{locked}</dd>
          </div>
        </dl>

        <div className="toolbar">
          <Input
            aria-label="Tìm tài khoản"
            placeholder="Tìm theo tên đăng nhập, tên hiển thị, email…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            aria-label="Lọc vai trò"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as AccountRole | "ALL")
            }
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="MANAGER">{roleLabels.MANAGER}</option>
            <option value="EMPLOYEE">{roleLabels.EMPLOYEE}</option>
          </Select>
          <Select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AccountStatus | "ALL")
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">{statusLabels.ACTIVE}</option>
            <option value="LOCKED">{statusLabels.LOCKED}</option>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtered.length} tài khoản
          </span>
        </div>

        {error && (
          <div role="alert" className="error">
            {error}
            <Button variant="ghost" onClick={reload}>
              Thử lại
            </Button>
          </div>
        )}

        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải danh sách tài khoản…
          </p>
        ) : !filtered.length ? (
          <div className="rounded-panel border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">
              {accounts.length
                ? "Không có tài khoản phù hợp"
                : "Chưa có tài khoản"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {accounts.length
                ? "Xóa hoặc đổi điều kiện lọc để xem lại."
                : "Tạo tài khoản Quản lý đầu tiên để bắt đầu cấu hình quyền."}
            </p>
            {!accounts.length && (
              <Button size="sm" onClick={() => setCreating(true)}>
                Thêm tài khoản
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2 sm:hidden">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {item.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.username}
                      {item.email ? ` · ${item.email}` : ""}
                    </p>
                  </div>
                  <AccountBadges record={item} />
                  <p className="text-xs text-muted-foreground">
                    {item.employeeCode
                      ? `Mã nhân viên ${item.employeeCode}`
                      : "Chưa liên kết hồ sơ nhân sự"}
                  </p>
                  {actions(item)}
                </li>
              ))}
            </ul>
            <div className="relative hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Danh sách tài khoản theo vai trò và trạng thái
                </caption>
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th scope="col" className="px-2 py-2 font-medium">
                      Tài khoản
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Liên hệ
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Quyền
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Cập nhật
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-2 py-3 align-top">
                        <span className="block font-semibold text-foreground">
                          {item.displayName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.username}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className="block">{item.email || "—"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.employeeCode
                            ? `Mã nhân viên ${item.employeeCode}`
                            : "Chưa liên kết hồ sơ"}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <AccountBadges record={item} />
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className="block text-xs">
                          {formatDate(item.updatedAt)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.mustChangePassword
                            ? "Cần đổi mật khẩu"
                            : "Mật khẩu đã đổi"}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">{actions(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Tài khoản không bị xóa cứng; khóa tài khoản khi nhân viên nghỉ việc và
          không thể bớt Quản lý hoặc quản trị hệ thống cuối cùng.
        </p>
      </section>

      {creating && (
        <Modal title="Thêm tài khoản" onClose={() => setCreating(false)}>
          <AccountForm onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Chỉnh sửa ${editing.displayName}`}
          onClose={() => setEditing(null)}
        >
          <AccountForm record={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
      {changingAccess && (
        <Modal
          title={`Phân quyền ${changingAccess.displayName}`}
          onClose={() => setChangingAccess(null)}
        >
          <AccessDialog
            record={changingAccess}
            onClose={() => setChangingAccess(null)}
          />
        </Modal>
      )}
      {resetting && (
        <Modal title="Đặt lại mật khẩu" onClose={() => setResetting(null)}>
          <PasswordDialog
            record={resetting}
            onClose={() => setResetting(null)}
          />
        </Modal>
      )}
      {viewingHistory && (
        <Modal title="Lịch sử quyền" onClose={() => setViewingHistory(null)}>
          <HistoryDialog
            record={viewingHistory}
            onClose={() => setViewingHistory(null)}
          />
        </Modal>
      )}
    </div>
  );
}
