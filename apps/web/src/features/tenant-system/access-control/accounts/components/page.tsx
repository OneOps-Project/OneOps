"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Users, ShieldCheck } from "lucide-react";
import { useAccounts } from "../hooks/use-accounts";
import { accountsApi } from "../api/client";
import { roleLabels, statusLabels } from "../constants";
import type { Account, AccountGroup } from "../types";
import { AccountForm } from "./account-form";
import { AccountAction, AccountHistory } from "./account-actions";
import { EmployeeForm } from "./employee-form";
import { AdministrationForm } from "./administration-form";
import { AccountNotifications } from "./notifications";
import { GroupForm } from "./group-form";
import { Button } from "./primitives/button";
import { Input, Select } from "./primitives/forms";
import { Dialog } from "./primitives/dialog";
import styles from "./styles.module.css";
type Modal =
  | { kind: "employee" }
  | { kind: "permissions"; account: Account }
  | { kind: "create" }
  | { kind: "edit" | "role" | "status" | "password"; account: Account }
  | {
      kind: "history";
      entityId: string;
      entityKind: "account" | "account-group";
      name: string;
    }
  | { kind: "group"; group?: AccountGroup };
export function AccountsPage() {
  const params = useSearchParams();
  const view = params.get("view") === "groups" ? "groups" : "accounts";
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<Modal | null>(null);
  const [noticeRevision, setNoticeRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const state = useAccounts(query, role, status, page, view);
  function saved(text: string) {
    setModal(null);
    setMessage(text);
    setNoticeRevision((value) => value + 1);
    state.reload();
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    const data = new FormData(e.currentTarget);
    try {
      state.setActor(
        await accountsApi.login(
          String(data.get("username")),
          String(data.get("password")),
        ),
      );
      state.reload();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Đăng nhập thất bại.");
    } finally {
      setLoginBusy(false);
    }
  }
  async function logout() {
    try {
      await accountsApi.logout();
      state.setActor(null);
      setModal(null);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không đăng xuất được.");
    }
  }
  if (!state.sessionChecked)
    return <p role="status">Đang kiểm tra phiên làm việc…</p>;
  if (!state.actor)
    return (
      <section className={styles.login}>
        <ShieldCheck className="mb-4 size-8 text-primary" />
        <h1 className="text-xl font-semibold">Đăng nhập quản trị tài khoản</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sử dụng tài khoản được cấp quyền quản trị. Các thao tác được kiểm tra
          tại backend.
        </p>
        <form onSubmit={login} className={styles.form}>
          <label className={styles.field}>
            Tên đăng nhập hoặc email
            <Input
              name="username"
              required
              autoComplete="username"
              disabled={loginBusy}
            />
          </label>
          <label className={styles.field}>
            Mật khẩu
            <Input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={loginBusy}
            />
          </label>
          {(loginError || state.error) && (
            <p role="alert" className="text-sm text-destructive">
              {loginError || state.error}
            </p>
          )}
          <Button type="submit" loading={loginBusy}>
            Đăng nhập
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Quản trị viên khởi tạo tài khoản đầu tiên bằng quy trình thiết lập cục
          bộ được mô tả trong tài liệu module.
        </p>
      </section>
    );
  if (!(state.actor.manageAccounts || state.actor.superAdmin))
    return (
      <section className={styles.panel}>
        <div className={styles.empty}>
          <h1 className="mb-3 text-xl font-semibold text-foreground">
            Không có quyền quản trị tài khoản
          </h1>
          <p>
            Vai trò Quản lý không tự cấp quyền quản trị. Liên hệ người có thẩm
            quyền để được cấp quyền phù hợp.
          </p>
          <Button className="mt-4" variant="secondary" onClick={logout}>
            Đăng xuất
          </Button>
        </div>
      </section>
    );
  const dialogTitle = !modal
    ? ""
    : modal.kind === "employee"
      ? "Tạo hồ sơ nhân viên"
      : modal.kind === "permissions"
        ? "Quyền quản trị tài khoản"
        : modal.kind === "create"
          ? "Tạo tài khoản"
          : modal.kind === "edit"
            ? "Sửa thông tin tài khoản"
            : modal.kind === "role"
              ? "Thay đổi vai trò"
              : modal.kind === "status"
                ? `${modal.account.status === "ACTIVE" ? "Khóa" : "Mở khóa"} tài khoản`
                : modal.kind === "password"
                  ? "Đặt lại mật khẩu"
                  : modal.kind === "history"
                    ? `Lịch sử · ${modal.name}`
                    : modal.kind === "group" && modal.group
                      ? "Chỉnh sửa nhóm tài khoản"
                      : "Tạo nhóm tài khoản";
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className="mb-2 text-xs font-medium text-primary">
            QUẢN TRỊ HỆ THỐNG
          </p>
          <h1 className="text-2xl font-semibold">
            {view === "groups" ? "Nhóm tài khoản" : "Quản lý tài khoản"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {view === "groups"
              ? "Tập hợp tài khoản để cấp quyền cho nhiều người; không thay thế cơ cấu phòng ban."
              : "Cấp tài khoản đúng nhân sự, kiểm soát truy cập và theo dõi thay đổi."}
          </p>
        </div>
        <div className={styles.actions}>
          {view !== "groups" && (
            <Button
              variant="secondary"
              onClick={() => setModal({ kind: "employee" })}
            >
              Tạo hồ sơ nhân viên
            </Button>
          )}
          <Button variant="secondary" onClick={state.reload}>
            <RefreshCw />
            Làm mới
          </Button>
          <Button
            onClick={() =>
              setModal(
                view === "groups" ? { kind: "group" } : { kind: "create" },
              )
            }
          >
            <Plus />
            {view === "groups" ? "Tạo nhóm" : "Tạo tài khoản"}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-muted px-4 py-3 text-sm">
        <span>
          <ShieldCheck className="mr-2 inline size-4 text-primary" />@
          {state.actor.username} ·{" "}
          {state.actor.superAdmin
            ? "Quản trị cấp cao"
            : "Quản lý có quyền quản trị"}
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Đăng xuất
        </Button>
      </div>
      {message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-control border border-border bg-surface p-4 text-sm"
        >
          <span>{message}</span>
          <Button variant="ghost" size="sm" onClick={() => setMessage("")}>
            Đóng
          </Button>
        </div>
      )}
      <AccountNotifications revision={noticeRevision} />
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div className="min-w-0 flex-1">
            <Input
              aria-label={
                view === "groups" ? "Tìm kiếm nhóm" : "Tìm kiếm tài khoản"
              }
              placeholder={
                view === "groups"
                  ? "Tìm tên nhóm, directory…"
                  : "Tìm tên, mã nhân viên, username, email…"
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {view !== "groups" && (
            <>
              <Select
                className="w-auto"
                aria-label="Lọc vai trò"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả vai trò</option>
                <option value="EMPLOYEE">Nhân viên</option>
                <option value="MANAGER">Quản lý</option>
              </Select>
              <Select
                className="w-auto"
                aria-label="Lọc trạng thái"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Đã khóa</option>
              </Select>
            </>
          )}
          <span className="text-sm text-muted-foreground">
            {state.total} {view === "groups" ? "nhóm" : "tài khoản"}
          </span>
        </div>
        {state.error ? (
          <div role="alert" className={styles.empty}>
            <p className="text-destructive">{state.error}</p>
            <Button className="mt-3" variant="secondary" onClick={state.reload}>
              Thử lại
            </Button>
          </div>
        ) : state.loading ? (
          <p role="status" className={styles.empty}>
            Đang tải dữ liệu…
          </p>
        ) : !(view === "groups" ? state.groups.length : state.rows.length) ? (
          <div className={styles.empty}>
            <Users className="mx-auto mb-3 size-8" />
            <p>Không có {view === "groups" ? "nhóm" : "tài khoản"} phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={styles.table}>
              <caption className="sr-only">
                {view === "groups"
                  ? "Danh sách nhóm tài khoản"
                  : "Danh sách tài khoản nhân viên"}
              </caption>
              {view === "groups" ? (
                <>
                  <thead>
                    <tr>
                      <th scope="col">Nhóm</th>
                      <th scope="col">Người sở hữu</th>
                      <th scope="col">Thành viên</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.groups.map((group) => (
                      <tr key={group.id}>
                        <td>
                          <strong>{group.name}</strong>
                          <p className="text-xs text-muted-foreground">
                            {group.directory}
                          </p>
                        </td>
                        <td>{group.owner.displayName}</td>
                        <td>{group.members.length}</td>
                        <td>
                          <div className={styles.actions}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setModal({ kind: "group", group })}
                            >
                              Chỉnh sửa
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setModal({
                                  kind: "history",
                                  entityId: group.id,
                                  entityKind: "account-group",
                                  name: group.name,
                                })
                              }
                            >
                              Lịch sử
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr>
                      <th scope="col">Nhân viên</th>
                      <th scope="col">Tài khoản</th>
                      <th scope="col">Vai trò</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.rows.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <strong>{account.displayName}</strong>
                          <p className="text-xs text-muted-foreground">
                            {account.employeeCode}
                          </p>
                        </td>
                        <td>
                          <p>@{account.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.email}
                          </p>
                        </td>
                        <td>{roleLabels[account.role]}</td>
                        <td>
                          <span
                            className={`${styles.status} ${account.status === "ACTIVE" ? styles.active : styles.locked}`}
                          >
                            {statusLabels[account.status]}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setModal({ kind: "edit", account })
                              }
                            >
                              Sửa
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setModal({ kind: "role", account })
                              }
                            >
                              Vai trò
                            </Button>
                            {state.actor?.superAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setModal({ kind: "permissions", account })
                                }
                              >
                                Quyền quản trị
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={
                                account.id === state.actor?.id &&
                                account.status === "ACTIVE"
                              }
                              onClick={() =>
                                setModal({ kind: "status", account })
                              }
                            >
                              {account.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setModal({ kind: "password", account })
                              }
                            >
                              Đặt lại mật khẩu
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setModal({
                                  kind: "history",
                                  entityId: account.id,
                                  entityKind: "account",
                                  name: account.username,
                                })
                              }
                            >
                              Lịch sử
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
        {view !== "groups" && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="text-sm text-muted-foreground">
              Trang {page} / {Math.max(1, Math.ceil(state.total / 20))}
            </span>
            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || state.loading}
                onClick={() => setPage((value) => value - 1)}
              >
                Trước
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * 20 >= state.total || state.loading}
                onClick={() => setPage((value) => value + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </section>
      {modal && (
        <Dialog open onClose={() => setModal(null)} title={dialogTitle}>
          {modal.kind === "employee" ? (
            <EmployeeForm onSaved={saved} onClose={() => setModal(null)} />
          ) : modal.kind === "permissions" ? (
            <AdministrationForm
              account={modal.account}
              onSaved={saved}
              onClose={() => setModal(null)}
            />
          ) : modal.kind === "create" ? (
            <AccountForm onSaved={saved} onClose={() => setModal(null)} />
          ) : modal.kind === "edit" ? (
            <AccountForm
              account={modal.account}
              onSaved={saved}
              onClose={() => setModal(null)}
            />
          ) : modal.kind === "history" ? (
            <AccountHistory id={modal.entityId} kind={modal.entityKind} />
          ) : modal.kind === "group" ? (
            <GroupForm
              group={modal.group}
              onSaved={saved}
              onClose={() => setModal(null)}
            />
          ) : (
            <AccountAction
              account={modal.account}
              action={modal.kind}
              onSaved={saved}
              onClose={() => setModal(null)}
            />
          )}
        </Dialog>
      )}
    </div>
  );
}
