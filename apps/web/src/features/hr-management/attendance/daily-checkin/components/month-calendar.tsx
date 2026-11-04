"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MonthDay } from "@/features/hr-management/attendance/daily-checkin/types";
import {
  flagLabels,
  statusLabels,
  statusVariants,
} from "@/features/hr-management/attendance/daily-checkin/constants";
import { Button } from "@/features/hr-management/attendance/daily-checkin/components/primitives/button";
import { Badge } from "@/features/hr-management/attendance/daily-checkin/components/primitives/foundations";
import { formatTime } from "@/features/hr-management/attendance/daily-checkin/components/format";
import styles from "@/features/hr-management/attendance/daily-checkin/components/styles.module.css";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const legend = ["office", "remote", "business", "leave", "absent"] as const;

function shiftMonth(month: string, delta: number) {
  const [year, index] = month.split("-").map(Number);
  const next = new Date(year, index - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthCalendar({
  month,
  today,
  days,
  loading,
  selected,
  onMonthChange,
  onSelect,
}: {
  month: string;
  today: string;
  days: MonthDay[];
  loading: boolean;
  selected: string;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const [year, index] = month.split("-").map(Number);
  const total = new Date(year, index, 0).getDate();
  const offset = (new Date(year, index - 1, 1).getDay() + 6) % 7;
  const byDate = new Map(days.map((day) => [day.date, day]));
  const detail = byDate.get(selected);

  return (
    <section className={styles.calendar} aria-labelledby="calendar-title">
      <div className={styles.calendarHead}>
        <h2 id="calendar-title">
          Tháng {index}/{year}
        </h2>
        <div className={styles.calendarNav}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tháng trước"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tháng sau"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className={styles.grid} aria-busy={loading}>
        {weekdays.map((day) => (
          <span key={day} className={styles.weekday}>
            {day}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const day = byDate.get(date);
          return (
            <button
              key={date}
              type="button"
              className={styles.day}
              data-status={day?.status}
              data-flagged={day?.flags.length ? "" : undefined}
              aria-pressed={selected === date}
              aria-current={today === date ? "date" : undefined}
              aria-label={
                `Ngày ${i + 1}` + (day ? ", " + statusLabels[day.status] : "")
              }
              onClick={() => onSelect(date)}
            >
              {i + 1}
              <span className={styles.dot} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <ul className={styles.legend} aria-label="Chú thích">
        {legend.map((status) => (
          <li key={status} data-status={status}>
            <span className={styles.dot} aria-hidden="true" />
            {statusLabels[status]}
          </li>
        ))}
      </ul>

      <div className={styles.detail} aria-live="polite">
        <h3>Ngày {selected.split("-").reverse().join("/")}</h3>
        {detail ? (
          <>
            <Badge variant={statusVariants[detail.status]} dot>
              {statusLabels[detail.status]}
            </Badge>
            <p>
              Vào <strong>{formatTime(detail.checkInAt)}</strong> · Ra{" "}
              <strong>{formatTime(detail.checkOutAt)}</strong>
            </p>
            {detail.flags.length > 0 && (
              <div className={styles.flags}>
                {detail.flags.map((flag) => (
                  <Badge key={flag} variant="warning">
                    {flagLabels[flag]}
                  </Badge>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className={styles.muted}>Không có dữ liệu điểm danh.</p>
        )}
      </div>
    </section>
  );
}
