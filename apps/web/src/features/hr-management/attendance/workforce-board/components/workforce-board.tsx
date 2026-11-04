"use client";
import { useMemo, useState } from "react";
import { BellRing, Clock, Wifi } from "lucide-react";
import type {
  Member,
  WorkStatus,
} from "@/features/hr-management/attendance/workforce-board/types";
import {
  flagLabels,
  statusLabels,
  statusVariants,
} from "@/features/hr-management/attendance/workforce-board/constants";
import {
  useReminder,
  useWorkforce,
} from "@/features/hr-management/attendance/workforce-board/hooks/use-workforce";
import { Button } from "@/features/hr-management/attendance/workforce-board/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/hr-management/attendance/workforce-board/components/primitives/forms";
import { Badge } from "@/features/hr-management/attendance/workforce-board/components/primitives/foundations";
import styles from "@/features/hr-management/attendance/workforce-board/components/styles.module.css";

type Filter = WorkStatus | "late" | "";
const summaryCards: { key: Exclude<Filter, "">; label: string }[] = [
  { key: "office", label: "Tại văn phòng" },
  { key: "business", label: "Công tác" },
  { key: "remote", label: "Remote" },
  { key: "absent", label: "Chưa điểm danh" },
  { key: "late", label: "Đi muộn" },
];
const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});
function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}
function formatTime(value: string | null) {
  return value ? timeFormat.format(new Date(value)) : "—";
}
function matches(member: Member, filter: Filter) {
  if (!filter) return true;
  return filter === "late"
    ? member.flags.includes("late")
    : member.status === filter;
}

export function WorkforceBoard() {
  const [date, setDate] = useState(todayIso);
  const [filter, setFilter] = useState<Filter>("");
  const [groupId, setGroupId] = useState("");
  const [query, setQuery] = useState("");
  const { data, loading, error, reload } = useWorkforce(date);
  const reminder = useReminder();
  const members = useMemo(() => data?.members ?? [], [data]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        summaryCards.map((card) => [
          card.key,
          members.filter((m) => matches(m, card.key)).length,
        ]),
      ) as Record<Exclude<Filter, "">, number>,
    [members],
  );
  const keyword = query.trim().toLocaleLowerCase("vi");
  const visible = members.filter(
    (m) =>
      matches(m, filter) &&
      (!groupId || m.groupId === groupId) &&
      m.name.toLocaleLowerCase("vi").includes(keyword),
  );
  const absent = members.filter((m) => m.status === "absent");
  const groups = data?.groups ?? [];
  const sections = [
    ...groups.map((group) => ({
      id: group.id,
      name: group.name,
      members: visible.filter((m) => m.groupId === group.id),
    })),
    {
      id: "",
      name: "Chưa có nhóm",
      members: visible.filter(
        (m) => !groups.some((group) => group.id === m.groupId),
      ),
    },
  ].filter((section) => section.members.length);

  return (
    <div className="module-view">
      <section className="records-panel">
        <header className={styles.header}>
          <h1>Quản lý Điểm danh & Phê Duyệt</h1>
          {data && (
            <div className={styles.meta}>
              <p className={styles.chip}>
                <Wifi className={styles.iconOnline} aria-hidden="true" />
                IP Văn Phòng:
                <span className={styles.value}>
                  {data.policy.officeIps.join(", ") || "Chưa cấu hình"}
                </span>
              </p>
              <p className={styles.chip}>
                <Clock className={styles.iconTime} aria-hidden="true" />
                Ca chuẩn:
                <span className={styles.value}>
                  {data.policy.shiftStart} - {data.policy.shiftEnd}
                </span>
              </p>
            </div>
          )}
        </header>

        <div className={styles.cards}>
          {summaryCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={styles.card}
              aria-pressed={filter === card.key}
              onClick={() => setFilter(filter === card.key ? "" : card.key)}
            >
              <span>{card.label}</span>
              <strong>{loading ? "…" : counts[card.key]}</strong>
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <Input
            type="date"
            aria-label="Ngày"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <Select
            aria-label="Lọc theo nhóm"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">Tất cả nhóm</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
          <Input
            aria-label="Tìm nhân viên"
            placeholder="Tìm nhân viên…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filter && (
            <Button variant="ghost" onClick={() => setFilter("")}>
              Bỏ lọc
            </Button>
          )}
        </div>

        {error && (
          <div role="alert" className="error">
            {error}
            <Button variant="ghost" onClick={reload}>
              Thử lại
            </Button>
          </div>
        )}

        {absent.length > 0 && (
          <section className={styles.absent} aria-labelledby="absent-title">
            <div className={styles.absentHead}>
              <h2 id="absent-title">
                {absent.length} nhân viên chưa điểm danh
              </h2>
              <Button
                variant="secondary"
                size="sm"
                loading={reminder.pending}
                onClick={() => reminder.remind(absent.map((m) => m.employeeId))}
              >
                <BellRing aria-hidden="true" />
                Nhắc tất cả
              </Button>
            </div>
            <ul className={styles.absentList}>
              {absent.map((member) => (
                <li key={member.employeeId}>
                  {member.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={reminder.pending}
                    aria-label={"Nhắc " + member.name}
                    onClick={() => reminder.remind([member.employeeId])}
                  >
                    Nhắc
                  </Button>
                </li>
              ))}
            </ul>
            {reminder.message && <p role="status">{reminder.message}</p>}
          </section>
        )}

        {loading ? (
          <p role="status">Đang tải dữ liệu…</p>
        ) : error ? null : !sections.length ? (
          <div className={styles.empty}>
            <h2>Không có nhân viên phù hợp</h2>
            <p>Thay đổi ngày, nhóm hoặc điều kiện lọc.</p>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.id} className={styles.group}>
              <h2>
                {section.name} <span>({section.members.length})</span>
              </h2>
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Trạng thái</th>
                      <th>Giờ vào</th>
                      <th>Giờ ra</th>
                      <th>Ghi nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.members.map((member) => (
                      <tr key={member.employeeId}>
                        <td>{member.name}</td>
                        <td>
                          <Badge variant={statusVariants[member.status]} dot>
                            {statusLabels[member.status]}
                          </Badge>
                        </td>
                        <td>{formatTime(member.checkInAt)}</td>
                        <td>{formatTime(member.checkOutAt)}</td>
                        <td>
                          <div className={styles.flags}>
                            {member.flags.map((flag) => (
                              <Badge key={flag} variant="warning">
                                {flagLabels[flag]}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </section>
    </div>
  );
}
