"use client";
import { useState } from "react";
import type {
  Explanation,
  ExplanationStatus,
} from "@/features/hr-management/attendance/checkin-explanations/types";
import {
  issueLabels,
  statusTabs,
} from "@/features/hr-management/attendance/checkin-explanations/constants";
import {
  useExplanations,
  useReview,
} from "@/features/hr-management/attendance/checkin-explanations/hooks/use-explanations";
import { Button } from "@/features/hr-management/attendance/checkin-explanations/components/primitives/button";
import { Textarea } from "@/features/hr-management/attendance/checkin-explanations/components/primitives/forms";
import { Badge } from "@/features/hr-management/attendance/checkin-explanations/components/primitives/foundations";
import styles from "@/features/hr-management/attendance/checkin-explanations/components/styles.module.css";

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ExplanationReview() {
  const [status, setStatus] = useState<ExplanationStatus>("pending");
  const { items, loading, error, reload } = useExplanations(status);
  const review = useReview(reload);
  const [rejecting, setRejecting] = useState<Explanation | null>(null);
  const [note, setNote] = useState("");

  async function submitReject() {
    if (!rejecting || !note.trim()) return;
    if (await review.reject(rejecting, note)) {
      setRejecting(null);
      setNote("");
    }
  }

  return (
    <div className="module-view">
      <section className="records-panel">
        <header className={styles.header}>
          <div>
            <h1>Duyệt giải trình điểm danh</h1>
            <p>Duyệt đơn để sửa dữ liệu điểm danh của nhân viên.</p>
          </div>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Trạng thái đơn">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              className={styles.tab}
              onClick={() => setStatus(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(error || review.error) && (
          <div role="alert" className="error">
            {error || review.error}
            <Button variant="ghost" onClick={reload}>
              Thử lại
            </Button>
          </div>
        )}

        {loading ? (
          <p role="status">Đang tải dữ liệu…</p>
        ) : error ? null : !items.length ? (
          <div className={styles.empty}>
            <h2>Không có đơn giải trình</h2>
            <p>Đơn mới của nhân viên sẽ hiện ở đây.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <div>
                    <strong>{item.employeeName}</strong>
                    {item.groupName && <span> · {item.groupName}</span>}
                  </div>
                  <Badge variant="warning">{issueLabels[item.issue]}</Badge>
                </div>
                <dl className={styles.facts}>
                  <div>
                    <dt>Ngày</dt>
                    <dd>{dateFormat.format(new Date(item.date))}</dd>
                  </div>
                  <div>
                    <dt>Giờ vào đề nghị</dt>
                    <dd>{item.requestedCheckIn ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Giờ ra đề nghị</dt>
                    <dd>{item.requestedCheckOut ?? "—"}</dd>
                  </div>
                </dl>
                <p className={styles.reason}>{item.reason}</p>
                {item.reviewNote && (
                  <p className={styles.note}>
                    Ghi chú duyệt: {item.reviewNote}
                  </p>
                )}
                {item.status === "pending" &&
                  (rejecting?.id === item.id ? (
                    <div className={styles.rejectForm}>
                      <label htmlFor={"reject-" + item.id}>Lý do từ chối</label>
                      <Textarea
                        id={"reject-" + item.id}
                        value={note}
                        maxLength={1000}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className={styles.actions}>
                        <Button
                          variant="secondary"
                          onClick={() => setRejecting(null)}
                        >
                          Hủy
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={!note.trim()}
                          loading={review.pendingId === item.id}
                          onClick={submitReject}
                        >
                          Xác nhận từ chối
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.actions}>
                      <Button
                        variant="secondary"
                        disabled={Boolean(review.pendingId)}
                        onClick={() => {
                          setRejecting(item);
                          setNote("");
                        }}
                      >
                        Từ chối
                      </Button>
                      <Button
                        loading={review.pendingId === item.id}
                        disabled={Boolean(review.pendingId)}
                        onClick={() => review.approve(item)}
                      >
                        Duyệt
                      </Button>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
