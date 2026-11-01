"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Account } from "../types";
import { accountsApi } from "../api/client";
import { Button } from "./primitives/button";
import styles from "./styles.module.css";
export function AdministrationForm({
  account,
  onSaved,
  onClose,
}: {
  account: Account;
  onSaved(message: string): void;
  onClose(): void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [superAdmin, setSuperAdmin] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void accountsApi
      .permissions(account.id, controller.signal)
      .then((value) => {
        setEnabled(value.manageAccounts);
        setSuperAdmin(value.superAdmin);
        setLoaded(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [account.id]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await accountsApi.setAdministration(account.id, enabled);
      onSaved("Đã cập nhật quyền quản trị tài khoản và thu hồi phiên cũ.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được quyền.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className={styles.form}>
      <p className="text-sm">
        {account.displayName} · @{account.username}
      </p>
      {!loaded && !error && <p role="status">Đang tải quyền hiện hành…</p>}
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={!loaded || busy || superAdmin || account.role !== "MANAGER"}
        />
        Cho phép quản trị tài khoản
      </label>
      <p className="text-sm text-muted-foreground">
        Chỉ áp dụng cho vai trò Quản lý. Quyền này không cho phép tự cấp Quản
        trị cấp cao hoặc cấp quyền quản trị cho người khác.
      </p>
      {superAdmin && (
        <p className="text-sm">
          Tài khoản này là Quản trị cấp cao; cần quy trình bàn giao riêng để
          thay đổi.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Hủy
        </Button>
        <Button
          type="submit"
          loading={busy}
          disabled={!loaded || superAdmin || account.role !== "MANAGER"}
        >
          Xác nhận quyền
        </Button>
      </div>
    </form>
  );
}
