"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Account, Employee } from "../types";
import { accountsApi } from "../api/client";
import { Input, Select } from "./primitives/forms";
import { Button } from "./primitives/button";
import styles from "./styles.module.css";
export function AccountForm({
  account,
  onSaved,
  onClose,
}: {
  account?: Account;
  onSaved(message: string): void;
  onClose(): void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeId, setEmployeeId] = useState(account?.employeeId || "");
  const [username, setUsername] = useState(account?.username || "");
  const [email, setEmail] = useState(account?.email || "");
  const [role, setRole] = useState("EMPLOYEE");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!account);
  useEffect(() => {
    if (account) return;
    const controller = new AbortController();
    void accountsApi
      .employees(employeeQuery, controller.signal)
      .then(setEmployees)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [account, employeeQuery]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (account)
        await accountsApi.update(account.id, {
          username,
          email,
          version: account.version,
        });
      else
        await accountsApi.create({
          employeeId,
          username,
          email,
          role,
          password,
        });
      setPassword("");
      onSaved(
        account
          ? "Đã cập nhật tài khoản."
          : "Đã tạo tài khoản và liên kết nhân viên.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được tài khoản.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className={styles.form}>
      {account ? (
        <p className="text-sm text-muted-foreground">
          {account.employeeCode} · {account.displayName}
        </p>
      ) : (
        <div className={styles.field}>
          <label htmlFor="account-employee-id">Hồ sơ nhân viên</label>
          <Input
            aria-label="Tìm hồ sơ nhân viên"
            placeholder="Tìm mã, tên hoặc email nhân viên"
            value={employeeQuery}
            onChange={(e) => setEmployeeQuery(e.target.value)}
            disabled={busy}
          />
          <Select
            id="account-employee-id"
            aria-label="Hồ sơ nhân viên"
            required
            value={employeeId}
            disabled={loading || busy}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              const selected = employees.find(
                (value) => value.id === e.target.value,
              );
              if (selected) setEmail(selected.email);
            }}
          >
            <option value="">
              {loading ? "Đang tải hồ sơ…" : "Chọn nhân viên"}
            </option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.code} · {employee.name} ({employee.email})
              </option>
            ))}
          </Select>
          {!loading && !employees.length && (
            <span className="text-sm text-muted-foreground">
              Chưa có hồ sơ nhân viên khả dụng. Cần tạo hồ sơ trước khi cấp tài
              khoản.
            </span>
          )}
        </div>
      )}
      <label className={styles.field}>
        Tên đăng nhập
        <Input
          required
          minLength={3}
          maxLength={64}
          pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        Email công việc
        <Input
          required
          type="email"
          maxLength={254}
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </label>
      {!account && (
        <>
          <label className={styles.field}>
            Vai trò
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={busy}
            >
              <option value="EMPLOYEE">Nhân viên</option>
              <option value="MANAGER">Quản lý</option>
            </Select>
            <span className="text-xs text-muted-foreground">
              Vai trò Quản lý không tự cấp quyền quản trị tài khoản.
            </span>
          </label>
          <label className={styles.field}>
            Mật khẩu ban đầu
            <Input
              required
              type="password"
              aria-label="Mật khẩu ban đầu"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            <span className="text-xs text-muted-foreground">
              Ít nhất 12 ký tự, có chữ và số. Bàn giao qua kênh riêng.
            </span>
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
          disabled={!account && (!employeeId || loading)}
        >
          {account ? "Lưu thay đổi" : "Tạo tài khoản"}
        </Button>
      </div>
    </form>
  );
}
