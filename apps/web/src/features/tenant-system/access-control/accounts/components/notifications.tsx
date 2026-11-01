"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { accountsApi } from "../api/client";
import { Button } from "./primitives/button";
import styles from "./styles.module.css";
type Notice = {
  id: string;
  message: string;
  taskIds: string[];
  createdAt: string;
  readAt: string | null;
};
export function AccountNotifications({
  revision,
  compact = false,
}: {
  revision: number;
  compact?: boolean;
}) {
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void accountsApi
      .notifications(controller.signal)
      .then(setItems)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [revision]);
  async function read(id: string) {
    try {
      await accountsApi.readNotification(id);
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không cập nhật được thông báo.",
      );
    }
  }
  if (!items.length && !error) return null;
  return (
    <section className={`${styles.panel} p-4`} aria-label="Thông báo bàn giao">
      <h2 className="font-semibold">Công việc cần bàn giao</h2>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {(compact ? items.slice(0, 5) : items).map((item) => (
        <article
          key={item.id}
          className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm"
        >
          <div>
            <p>{item.message}</p>
            <Link
              href="/work-management/tasks?reassignment=1"
              className="text-primary underline"
            >
              Xem công việc cần giao lại
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          {!item.readAt && (
            <Button size="sm" variant="secondary" onClick={() => read(item.id)}>
              Đánh dấu đã đọc
            </Button>
          )}
        </article>
      ))}
    </section>
  );
}
