"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { accountsApi } from "../api/client";
import { Button } from "./primitives/button";
import { Input } from "./primitives/forms";
import styles from "./styles.module.css";
export function EmployeeForm({
  onSaved,
  onClose,
}: {
  onSaved(message: string): void;
  onClose(): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await accountsApi.createEmployee({
        code: String(input.get("code")),
        name: String(input.get("name")),
        email: String(input.get("email")),
      });
      onSaved(
        "Đã tạo hồ sơ nhân viên. Bạn có thể cấp tài khoản cho nhân viên này.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được hồ sơ.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={styles.form} onSubmit={submit}>
      <p className="text-sm text-muted-foreground">
        Hồ sơ được lưu trong module Nhân sự. Tài khoản được cấp ở bước riêng.
      </p>
      <label className={styles.field}>
        Mã nhân viên
        <Input
          name="code"
          required
          minLength={2}
          maxLength={100}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        Họ tên
        <Input name="name" required maxLength={200} disabled={busy} />
      </label>
      <label className={styles.field}>
        Email công việc
        <Input name="email" required type="email" disabled={busy} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" loading={busy}>
          Tạo hồ sơ
        </Button>
      </div>
    </form>
  );
}
