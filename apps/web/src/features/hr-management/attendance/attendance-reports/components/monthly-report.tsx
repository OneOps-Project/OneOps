"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import type { MonthlyReport } from "@/features/hr-management/attendance/attendance-reports/types";
import { dayLegend } from "@/features/hr-management/attendance/attendance-reports/constants";
import { useMonthlyReport } from "@/features/hr-management/attendance/attendance-reports/hooks/use-monthly-report";
import { Button } from "@/features/hr-management/attendance/attendance-reports/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/hr-management/attendance/attendance-reports/components/primitives/forms";
import styles from "@/features/hr-management/attendance/attendance-reports/components/styles.module.css";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function monthDates(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const days = new Date(year, monthIndex, 0).getDate();
  return Array.from(
    { length: days },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}
function exportCsv(report: MonthlyReport, dates: string[]) {
  const cell = (value: string | number) => {
    const text = String(value);
    return (
      '"' + (/^[=+@-]/.test(text) ? "'" : "") + text.replaceAll('"', '""') + '"'
    );
  };
  const csv = [
    [
      "Nhân viên",
      ...dates.map((date) => date.slice(8)),
      "Công",
      "Đi muộn",
      "Về sớm",
      "Nghỉ phép",
    ],
    ...report.rows.map((row) => {
      const byDate = new Map(row.days.map((day) => [day.date, day]));
      return [
        row.name,
        ...dates.map((date) => {
          const day = byDate.get(date);
          return day ? dayLegend[day.status].symbol : "";
        }),
        row.totals.workDays,
        row.totals.late,
        row.totals.early,
        row.totals.leave,
      ];
    }),
  ]
    .map((line) => line.map(cell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `diem-danh-${report.month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function MonthlyReportTable() {
  const [month, setMonth] = useState(currentMonth);
  const [groupId, setGroupId] = useState("");
  const { data, loading, error, reload } = useMonthlyReport(month, groupId);
  const dates = monthDates(month);

  return (
    <div className="module-view">
      <section className="records-panel">
        <header className={styles.header}>
          <div>
            <h1>Bảng điểm danh tháng</h1>
            <p>Tổng hợp công, đi muộn, về sớm và nghỉ phép theo tháng.</p>
          </div>
          <Button
            variant="secondary"
            disabled={!data?.rows.length}
            onClick={() => data && exportCsv(data, dates)}
          >
            <Download aria-hidden="true" />
            Xuất CSV
          </Button>
        </header>

        <div className={styles.toolbar}>
          <Input
            type="month"
            aria-label="Tháng"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
          <Select
            aria-label="Lọc theo nhóm"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">Tất cả nhóm</option>
            {data?.groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>

        <ul className={styles.legend} aria-label="Chú thích">
          {Object.values(dayLegend)
            .filter((item) => item.symbol)
            .map((item) => (
              <li key={item.symbol}>
                <b>{item.symbol}</b> {item.label}
              </li>
            ))}
        </ul>

        {error && (
          <div role="alert" className="error">
            {error}
            <Button variant="ghost" onClick={reload}>
              Thử lại
            </Button>
          </div>
        )}

        {loading ? (
          <p role="status">Đang tải dữ liệu…</p>
        ) : !data ? null : !data.rows.length ? (
          <div className={styles.empty}>
            <h2>Chưa có dữ liệu điểm danh</h2>
            <p>Chọn tháng hoặc nhóm khác.</p>
          </div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={styles.sticky}>
                    Nhân viên
                  </th>
                  {dates.map((date) => (
                    <th scope="col" key={date}>
                      {date.slice(8)}
                    </th>
                  ))}
                  <th scope="col">Công</th>
                  <th scope="col">Muộn</th>
                  <th scope="col">Sớm</th>
                  <th scope="col">Phép</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const byDate = new Map(
                    row.days.map((day) => [day.date, day]),
                  );
                  return (
                    <tr key={row.employeeId}>
                      <th scope="row" className={styles.sticky}>
                        {row.name}
                      </th>
                      {dates.map((date) => {
                        const day = byDate.get(date);
                        return (
                          <td
                            key={date}
                            data-status={day?.status}
                            data-flagged={day?.flags.length ? "" : undefined}
                            title={
                              day
                                ? dayLegend[day.status].label +
                                  (day.flags.length
                                    ? " · " + day.flags.join(", ")
                                    : "")
                                : undefined
                            }
                          >
                            {day ? dayLegend[day.status].symbol : ""}
                          </td>
                        );
                      })}
                      <td>{row.totals.workDays}</td>
                      <td>{row.totals.late}</td>
                      <td>{row.totals.early}</td>
                      <td>{row.totals.leave}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
