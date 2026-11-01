"use client";
import { useEffect, useState } from "react";
import { accountsApi } from "../api/client";
import type { Actor } from "../types";
import { AccountNotifications } from "./notifications";
import { Button } from "./primitives/button";
export function AccountSessionSummary() {
  const [actor, setActor] = useState<Actor | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void accountsApi
      .me()
      .then((value) => {
        if (active) setActor(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function logout() {
    try {
      await accountsApi.logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đăng xuất được.");
    }
  }
  return (
    <>
      <strong>{actor ? `@${actor.username}` : "Phiên làm việc"}</strong>
      <p>
        {actor
          ? actor.superAdmin
            ? "Quản trị cấp cao"
            : actor.role === "MANAGER"
              ? "Quản lý"
              : "Nhân viên"
          : "Đang kiểm tra tài khoản…"}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <AccountNotifications revision={0} compact />
      <Button variant="secondary" className="mb-4" onClick={logout}>
        Đăng xuất
      </Button>
    </>
  );
}
