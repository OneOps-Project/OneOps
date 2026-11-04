"use client";
import {
  statusLabels,
  statusVariants,
} from "@/features/hr-management/attendance/daily-checkin/constants";
import { useColleagues } from "@/features/hr-management/attendance/daily-checkin/hooks/use-attendance";
import { Button } from "@/features/hr-management/attendance/daily-checkin/components/primitives/button";
import { Badge } from "@/features/hr-management/attendance/daily-checkin/components/primitives/foundations";
import styles from "@/features/hr-management/attendance/daily-checkin/components/styles.module.css";

export function ColleaguesPanel() {
  const { data, loading, error, reload } = useColleagues();
  return (
    <section className={styles.colleagues} aria-labelledby="colleagues-title">
      <h2 id="colleagues-title">Đồng nghiệp hôm nay</h2>
      {loading ? (
        <p role="status">Đang tải…</p>
      ) : error ? (
        <div role="alert" className="error">
          {error}
          <Button variant="ghost" size="sm" onClick={reload}>
            Thử lại
          </Button>
        </div>
      ) : !data?.members.length ? (
        <p className={styles.muted}>Chưa có đồng nghiệp nào.</p>
      ) : (
        <ul>
          {data.members.map((member) => (
            <li key={member.employeeId}>
              <div>
                <strong>{member.name}</strong>
                {member.groupName && <span>{member.groupName}</span>}
              </div>
              <Badge variant={statusVariants[member.status]} dot>
                {statusLabels[member.status]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
