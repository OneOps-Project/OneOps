"use client";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RecordDto } from "../types";
import { client } from "../api/client";
import {
  useNotifications,
  notificationsChanged,
} from "../hooks/use-notifications";
import { Icon } from "./primitives/icon";
import { cn } from "./primitives/utils";
import styles from "./styles.module.css";

const sourceLabels: Record<string, string> = {
  task: "Công việc",
  comment: "Bình luận",
  message: "Tin nhắn",
  meeting: "Cuộc họp",
  request: "Phê duyệt",
};

export function ModulePage() {
  const params = useSearchParams();
  const router = useRouter();
  // The inbox belongs to the signed-in employee; the shell passes the name
  // through the link so the page never guesses an identity.
  const recipient = (params.get("recipient") || "").trim();
  const unreadOnly = params.get("unread") === "true";
  const { records, loading, error, unreadCount, reload } = useNotifications(
    recipient,
    unreadOnly ? true : undefined,
  );
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (action: () => Promise<unknown>, fallback: string) => {
      setPending(true);
      setActionError("");
      try {
        await action();
        notificationsChanged();
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : fallback);
      } finally {
        setPending(false);
      }
    },
    [],
  );

  const openItem = useCallback(
    async (item: RecordDto) => {
      if (!item.readAt) {
        setActionError("");
        try {
          await client.markRead(item.id);
          notificationsChanged();
        } catch (cause) {
          setActionError(
            cause instanceof Error
              ? cause.message
              : "Không đánh dấu được thông báo là đã đọc.",
          );
        }
      }
      if (item.link) router.push(item.link);
    },
    [router],
  );

  if (!recipient)
    return (
      <div className={styles.root}>
        <Header unreadCount={0} />
        <div className={styles.empty}>
          <Icon name="bell" size={32} />
          <p>
            Không xác định được người nhận thông báo. Mở trang này từ chuông
            thông báo để xem hộp thư của bạn.
          </p>
        </div>
      </div>
    );

  if (loading)
    return (
      <div className={styles.root}>
        <Header unreadCount={unreadCount} />
        <p role="status">Đang tải thông báo…</p>
      </div>
    );

  if (error)
    return (
      <div className={styles.root}>
        <Header unreadCount={0} />
        <p className={styles.error} role="alert">
          {error}
        </p>
        <button type="button" onClick={reload} className={styles.retry}>
          Thử lại
        </button>
      </div>
    );

  return (
    <div className={styles.root}>
      <Header unreadCount={unreadCount} />
      {unreadCount > 0 && (
        <button
          type="button"
          className={styles.markAll}
          disabled={pending}
          onClick={() =>
            void run(
              () => client.markAllRead(recipient),
              "Không đánh dấu được tất cả thông báo.",
            )
          }
        >
          Đánh dấu tất cả đã đọc
        </button>
      )}
      {actionError && (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      )}
      {!records.length ? (
        <div className={styles.empty}>
          <Icon name="bell" size={32} />
          <p>
            {unreadOnly
              ? "Không còn thông báo chưa đọc."
              : "Chưa có thông báo nào."}
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {records.map((item) => (
            <li
              key={item.id}
              className={cn(
                styles.item,
                item.readAt ? styles.read : styles.unread,
              )}
            >
              <button
                type="button"
                className={styles.open}
                onClick={() => void openItem(item)}
              >
                <span className={styles.meta}>
                  <span className={styles.source}>
                    {sourceLabels[item.source] ?? item.source}
                  </span>
                  <time className={styles.time} dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </time>
                </span>
                <span className={styles.title}>{item.title}</span>
                {item.body && <span className={styles.body}>{item.body}</span>}
              </button>
              {!item.readAt && (
                <>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className="sr-only">Chưa đọc</span>
                </>
              )}
              <button
                type="button"
                className={styles.delete}
                aria-label="Xóa thông báo này"
                title="Xóa thông báo này"
                disabled={pending}
                onClick={() =>
                  void run(
                    () => client.remove(item.id),
                    "Không xóa được thông báo.",
                  )
                }
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Header({ unreadCount }: { unreadCount: number }) {
  return (
    <div className={styles.header}>
      <h1>Thông báo</h1>
      {unreadCount > 0 && (
        <span className={styles.badge}>{unreadCount} chưa đọc</span>
      )}
    </div>
  );
}
