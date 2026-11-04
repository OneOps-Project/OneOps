"use client";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  useMonthAttendance,
  useToday,
} from "@/features/hr-management/attendance/daily-checkin/hooks/use-attendance";
import { Button } from "@/features/hr-management/attendance/daily-checkin/components/primitives/button";
import { TodayPanel } from "@/features/hr-management/attendance/daily-checkin/components/today-panel";
import { MonthCalendar } from "@/features/hr-management/attendance/daily-checkin/components/month-calendar";
import { ColleaguesPanel } from "@/features/hr-management/attendance/daily-checkin/components/colleagues-panel";
import { toMonthKey } from "@/features/hr-management/attendance/daily-checkin/components/format";
import styles from "@/features/hr-management/attendance/daily-checkin/components/styles.module.css";

const longDate = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function greeting(hour: number) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function MyAttendance() {
  const today = useToday();
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [selected, setSelected] = useState("");
  const history = useMonthAttendance(month);
  const todayKey = today.data?.date ?? "";

  return (
    <div className="module-view">
      <section className="records-panel">
        <header className={styles.header}>
          <div>
            <p className={styles.greeting}>
              {today.data ? `${greeting(new Date().getHours())}, ` : "Xin chào"}
              {today.data && <strong>{today.data.employeeName}</strong>}
            </p>
            <h1>Điểm danh ca làm việc hôm nay</h1>
          </div>
          {today.data && (
            <p className={styles.chip}>
              <CalendarDays aria-hidden="true" />
              {longDate.format(new Date(today.data.date))} · Ca{" "}
              {today.data.policy.shiftStart} - {today.data.policy.shiftEnd}
            </p>
          )}
        </header>

        {today.error && (
          <div role="alert" className="error">
            {today.error}
            <Button variant="ghost" onClick={today.reload}>
              Thử lại
            </Button>
          </div>
        )}
        {today.loading && !today.data ? (
          <p role="status">Đang tải dữ liệu…</p>
        ) : (
          today.data && (
            <TodayPanel
              key={`${today.data.record?.status}:${today.data.record?.checkOutAt}`}
              today={today.data}
            />
          )
        )}

        <div className={styles.layout}>
          <div>
            {history.error && (
              <div role="alert" className="error">
                {history.error}
                <Button variant="ghost" onClick={history.reload}>
                  Thử lại
                </Button>
              </div>
            )}
            <MonthCalendar
              month={month}
              today={todayKey}
              days={history.data?.days ?? []}
              loading={history.loading}
              selected={selected || todayKey}
              onMonthChange={setMonth}
              onSelect={setSelected}
            />
          </div>
          <ColleaguesPanel />
        </div>
      </section>
    </div>
  );
}
