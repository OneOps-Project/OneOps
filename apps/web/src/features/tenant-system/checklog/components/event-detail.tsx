"use client";
import { useEffect, useState } from "react";
import { checklogApi } from "../api/client";
import type { AuditDetail } from "../types";
import {
  actionLabel,
  entityLabel,
  moduleLabel,
  formatTime,
  resultLabels,
  fieldLabels,
} from "../constants";
import { Button } from "./primitives/button";
import styles from "./styles.module.css";
function display(key: string, value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (key === "role" && typeof value === "string")
    return value === "MANAGER"
      ? "Quản lý"
      : value === "EMPLOYEE"
        ? "Nhân viên"
        : value;
  if (key === "status" && typeof value === "string")
    return value === "ACTIVE"
      ? "Hoạt động"
      : value === "LOCKED"
        ? "Đã khóa"
        : value;
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (Array.isArray(value))
    return (
      value
        .map((item) =>
          typeof item === "object"
            ? JSON.stringify(item, null, 2)
            : String(item),
        )
        .join("\n") || "—"
    );
  return typeof value === "object"
    ? JSON.stringify(value, null, 2)
    : String(value);
}
export function EventDetail({
  id,
  onDenied,
}: {
  id: string;
  onDenied(): void;
}) {
  const [event, setEvent] = useState<AuditDetail | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void checklogApi
      .detail(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setEvent(value);
          setError("");
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error.status === 401 || error.status === 403) onDenied();
        setError(error.message);
      });
    return () => controller.abort();
  }, [id, retry, onDenied]);
  if (error)
    return (
      <div role="alert" className="mt-6 text-sm text-destructive">
        <p>{error}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => setRetry((value) => value + 1)}
        >
          Thử lại
        </Button>
      </div>
    );
  if (!event)
    return (
      <p role="status" className="mt-6 text-sm">
        Đang tải chi tiết sự kiện…
      </p>
    );
  const metadata = [
    ["Thời điểm", formatTime(event.createdAt)],
    ["Module", moduleLabel(event.module)],
    ["Người thực hiện", event.actorName],
    ["ID người thực hiện", event.actorId],
    ["Hành động", actionLabel(event.action)],
    ["Kết quả", resultLabels[event.result]],
    ["Loại đối tượng", entityLabel(event.entityType)],
    ["Đối tượng", event.entityName || event.entityId],
    ["ID đối tượng", event.entityId],
    ["Mã sự kiện", event.id],
  ];
  const keys = [
    ...new Set([
      ...Object.keys(event.before || {}),
      ...Object.keys(event.after || {}),
    ]),
  ].filter(
    (key) =>
      (JSON.stringify(event.before?.[key]) !==
        JSON.stringify(event.after?.[key]) ||
        JSON.stringify([event.before?.[key], event.after?.[key]]).includes(
          "[Đã che]",
        ) ||
        key.toLowerCase().includes("email")) &&
      !(
        key === "memberIds" &&
        (event.before?.memberNames || event.after?.memberNames)
      ),
  );
  return (
    <>
      <dl className={styles.detail}>
        {metadata.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.changes}>
        <h3 className="mb-3 font-semibold">Nội dung thay đổi</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Thông tin xác thực và dữ liệu nhạy cảm đã được che. Các giá trị đã che
          có thể hiển thị giống nhau dù dữ liệu gốc thay đổi.
        </p>
        {keys.length ? (
          <table className={styles.table}>
            <caption className="sr-only">Giá trị trước và sau sự kiện</caption>
            <thead>
              <tr>
                <th scope="col">Trường</th>
                <th scope="col">Trước</th>
                <th scope="col">Sau</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key}>
                  <th scope="row">{fieldLabels[key] || key}</th>
                  <td className={styles.value}>
                    {display(key, event.before?.[key])}
                  </td>
                  <td className={styles.value}>
                    {display(key, event.after?.[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sự kiện không có thay đổi giá trị hiển thị. Xem hành động và kết quả
            ở trên.
          </p>
        )}
      </div>
    </>
  );
}
