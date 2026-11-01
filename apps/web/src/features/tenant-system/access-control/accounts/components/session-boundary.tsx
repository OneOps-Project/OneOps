"use client";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { accountsApi } from "../api/client";
import { ApiError } from "../api/http";
import { Button } from "./primitives/button";
import { Input } from "./primitives/forms";
import styles from "./styles.module.css";
export function AccountSessionBoundary({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const check = () =>
      accountsApi
        .me()
        .then(() => {
          if (active) {
            setAuthenticated(true);
            setError("");
          }
        })
        .catch((reason) => {
          if (!active) return;
          setAuthenticated(false);
          if (!(reason instanceof ApiError && reason.status === 401))
            setError(reason.message);
        });
    void check();
    const interval = setInterval(() => {
      void check();
    }, 15000);
    const onSession = () => {
      void check();
    };
    window.addEventListener("oneops-session-changed", onSession);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("oneops-session-changed", onSession);
    };
  }, []);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const input = new FormData(e.currentTarget);
    try {
      await accountsApi.login(
        String(input.get("username")),
        String(input.get("password")),
      );
      setAuthenticated(true);
      window.dispatchEvent(new Event("oneops-session-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đăng nhập được.");
    } finally {
      setBusy(false);
    }
  }
  if (authenticated === null)
    return (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Đang kiểm tra phiên làm việc…
      </p>
    );
  if (authenticated) return children;
  return (
    <section className={styles.login}>
      <p className="mb-2 text-sm font-semibold text-primary">OneOps</p>
      <h1 className="text-xl font-semibold">Đăng nhập hệ thống</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Đăng nhập để truy cập công việc và các chức năng được cấp quyền.
      </p>
      <form onSubmit={login} className={styles.form}>
        <label className={styles.field}>
          Tên đăng nhập hoặc email
          <Input
            name="username"
            required
            autoComplete="username"
            disabled={busy}
          />
        </label>
        <label className={styles.field}>
          Mật khẩu
          <Input
            name="password"
            required
            type="password"
            autoComplete="current-password"
            disabled={busy}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" loading={busy}>
          Đăng nhập
        </Button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">
        Lần đầu sử dụng: người quản trị chạy{" "}
        <code>npm run accounts:bootstrap</code> trong terminal để tạo tài khoản
        đầu tiên.
      </p>
    </section>
  );
}
