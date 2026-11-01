"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { accountsApi } from "../api/client";
import type { Account, HistoryPage } from "../types";
import { roleLabels } from "../constants";
import { Button } from "./primitives/button";
import { Input, Select, Textarea } from "./primitives/forms";
import styles from "./styles.module.css";
export function AccountAction({
  account,
  action,
  onSaved,
  onClose,
}: {
  account: Account;
  action: "status" | "role" | "password";
  onSaved(message: string): void;
  onClose(): void;
}) {
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<Account["role"]>(account.role);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (action === "status") {
        const value = await accountsApi.status(account.id, {
          status: account.status === "ACTIVE" ? "LOCKED" : "ACTIVE",
          reason,
          version: account.version,
        });
        onSaved(
          `Đã ${account.status === "ACTIVE" ? "khóa" : "mở khóa"} tài khoản.${value.affectedTasks ? ` ${value.affectedTasks} công việc cần giao lại.` : ""}`,
        );
      } else if (action === "role") {
        await accountsApi.role(account.id, { role, version: account.version });
        onSaved("Đã cập nhật vai trò. Các phiên cũ đã được thu hồi.");
      } else {
        if (password !== confirmation)
          throw new Error("Mật khẩu xác nhận chưa khớp.");
        await accountsApi.password(account.id, {
          password,
          version: account.version,
        });
        setPassword("");
        setConfirmation("");
        onSaved("Đã đặt lại mật khẩu và thu hồi các phiên đăng nhập cũ.");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thực hiện được thao tác.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className={styles.form}>
      <p className="text-sm">
        {account.displayName} · @{account.username}
      </p>
      {action === "status" && (
        <>
          <p className="text-sm text-muted-foreground">
            {account.status === "ACTIVE"
              ? "Tài khoản sẽ mất quyền truy cập. Công việc đang mở được đánh dấu cần giao lại; không tự thay đổi người phụ trách hoặc deadline."
              : "Tài khoản sẽ được truy cập theo quyền hiện hành. Các thay đổi phân công trước đây được giữ nguyên."}
          </p>
          <label className={styles.field}>
            Lý do
            <Textarea
              required
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
          </label>
        </>
      )}
      {action === "role" && (
        <>
          <label className={styles.field}>
            Vai trò mới
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Account["role"])}
              disabled={busy}
            >
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <p className="text-sm text-muted-foreground">
            Quản lý không tự có quyền quản trị hệ thống. Hạ vai trò cần hoàn tất
            bàn giao trách nhiệm quản lý.
          </p>
        </>
      )}
      {action === "password" && (
        <>
          <p className="text-sm text-muted-foreground">
            Không thể xem mật khẩu hiện tại. Mật khẩu mới cần ít nhất 12 ký tự,
            có chữ và số.
          </p>
          <label className={styles.field}>
            Mật khẩu mới
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className={styles.field}>
            Xác nhận mật khẩu
            <Input
              required
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={busy}
            />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={busy}
        >
          Hủy
        </Button>
        <Button
          type="submit"
          loading={busy}
          disabled={action === "role" && role === account.role}
        >
          Xác nhận
        </Button>
      </div>
    </form>
  );
}
const actions: Record<string, string> = {
  "account.created": "Tạo tài khoản",
  "account.updated": "Sửa thông tin",
  "account.role-changed": "Thay đổi vai trò",
  "account.status-changed": "Khóa/mở khóa tài khoản",
  "account.password-reset": "Đặt lại mật khẩu",
  "account.bootstrapped": "Khởi tạo quản trị",
  "account-group.created": "Tạo nhóm",
  "account-group.updated": "Cập nhật nhóm",
};
export function AccountHistory({
  id,
  kind,
}: {
  id: string;
  kind: "account" | "account-group";
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryPage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void accountsApi
      .history(kind, id, page, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, kind, page]);
  return (
    <div className={styles.history}>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Đang tải lịch sử…</p>}
      {data?.items.map((event) => (
        <article key={event.id}>
          <strong>{actions[event.action] || event.action}</strong>
          <p className="my-2 text-xs text-muted-foreground">
            {event.actorName} ·{" "}
            {new Date(event.createdAt).toLocaleString("vi-VN")}
          </p>
          <HistoryChanges before={event.before} after={event.after} />
        </article>
      ))}
      {data && !data.items.length && <p>Chưa có lịch sử.</p>}
      {data && (
        <div className={styles.footer}>
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Trước
          </Button>
          <span className="self-center text-sm">Trang {page}</span>
          <Button
            variant="secondary"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage((value) => value + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}

const fieldLabels: Record<string, string> = {
  username: "Tên đăng nhập",
  email: "Email",
  role: "Vai trò",
  status: "Trạng thái",
  reason: "Lý do",
  affectedTasks: "Công việc cần giao lại",
  passwordChanged: "Đã đặt lại mật khẩu",
  manageAccounts: "Quyền quản trị tài khoản",
  name: "Tên nhóm",
  directory: "Directory",
  description: "Giới thiệu",
  ownerName: "Người sở hữu",
  memberNames: "Thành viên",
};
function historyValue(key: string, value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (key === "role" && typeof value === "string")
    return value === "MANAGER" ? "Quản lý" : "Nhân viên";
  if (key === "status" && typeof value === "string")
    return value === "ACTIVE" ? "Hoạt động" : "Đã khóa";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (Array.isArray(value))
    return value.map((item) => String(item)).join(", ") || "—";
  return String(value);
}
function HistoryChanges({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = Object.keys(fieldLabels).filter(
    (key) =>
      ((before && key in before) || (after && key in after)) &&
      JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]),
  );
  return (
    <dl className="mt-3 space-y-3 text-sm">
      {keys.map((key) => (
        <div key={key}>
          <dt className="font-medium">{fieldLabels[key]}</dt>
          <dd className="break-words text-muted-foreground">
            {before && (
              <span>
                Trước: {historyValue(key, before[key])}
                <br />
              </span>
            )}
            Sau: {historyValue(key, after?.[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}
