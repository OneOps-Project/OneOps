"use client";
import { useState } from "react";
import {
  Briefcase,
  Building2,
  Laptop,
  LogOut,
  Wifi,
  WifiOff,
} from "lucide-react";
import type {
  Today,
  WorkMode,
} from "@/features/hr-management/attendance/daily-checkin/types";
import {
  flagLabels,
  modeOptions,
  statusLabels,
} from "@/features/hr-management/attendance/daily-checkin/constants";
import { useCheckInActions } from "@/features/hr-management/attendance/daily-checkin/hooks/use-attendance";
import { Button } from "@/features/hr-management/attendance/daily-checkin/components/primitives/button";
import { Input } from "@/features/hr-management/attendance/daily-checkin/components/primitives/forms";
import { Badge } from "@/features/hr-management/attendance/daily-checkin/components/primitives/foundations";
import { formatTime } from "@/features/hr-management/attendance/daily-checkin/components/format";
import styles from "@/features/hr-management/attendance/daily-checkin/components/styles.module.css";

const modeIcons = { office: Building2, business: Briefcase, remote: Laptop };

export function TodayPanel({ today }: { today: Today }) {
  const { record, network } = today;
  const actions = useCheckInActions();
  const [mode, setMode] = useState<WorkMode>(record?.status ?? "office");
  const [note, setNote] = useState(record?.note ?? "");
  const closed = Boolean(record?.checkOutAt);
  const blockedByNetwork = mode === "office" && !network.inOffice;
  const missingNote = mode === "business" && !note.trim();
  const unchanged = record?.status === mode && record.note === note.trim();
  const option = modeOptions.find((item) => item.value === mode);

  async function submit() {
    if (blockedByNetwork || missingNote) return;
    const input = { status: mode, note };
    if (record) await actions.changeStatus(input);
    else await actions.checkIn(input);
  }

  return (
    <section className={styles.today} aria-labelledby="today-title">
      <div className={styles.todayHead}>
        <h2 id="today-title">
          {record ? "Trạng thái làm việc hôm nay" : "Chọn hình thức làm việc"}
        </h2>
        <p
          className={network.inOffice ? styles.netOk : styles.netOff}
          role="status"
        >
          {network.inOffice ? (
            <Wifi aria-hidden="true" />
          ) : (
            <WifiOff aria-hidden="true" />
          )}
          {network.inOffice ? "Đang ở mạng văn phòng" : "Ngoài mạng văn phòng"}{" "}
          · {network.ip}
        </p>
      </div>

      {record && (
        <div className={styles.recordLine}>
          <span>
            Check-in <strong>{formatTime(record.checkInAt)}</strong>
          </span>
          {record.checkOutAt && (
            <span>
              Check-out <strong>{formatTime(record.checkOutAt)}</strong>
            </span>
          )}
          <span>{statusLabels[record.status]}</span>
          {record.flags.map((flag) => (
            <Badge key={flag} variant="warning">
              {flagLabels[flag]}
            </Badge>
          ))}
        </div>
      )}

      {closed ? (
        <p className={styles.muted}>
          Bạn đã kết thúc ngày làm việc. Hẹn gặp lại ngày mai!
        </p>
      ) : (
        <>
          <div
            className={styles.modes}
            role="radiogroup"
            aria-label="Hình thức làm việc"
          >
            {modeOptions.map((item) => {
              const Icon = modeIcons[item.value];
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === item.value}
                  className={styles.mode}
                  data-mode={item.value}
                  disabled={actions.pending}
                  onClick={() => {
                    setMode(item.value);
                    actions.clearError();
                  }}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className={styles.submitRow}>
            <Input
              aria-label="Ghi chú"
              aria-invalid={missingNote || undefined}
              placeholder={option?.placeholder}
              value={note}
              maxLength={500}
              disabled={actions.pending}
              onChange={(e) => {
                setNote(e.target.value);
                actions.clearError();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
            <Button
              loading={actions.pending}
              disabled={blockedByNetwork || missingNote || unchanged}
              onClick={submit}
            >
              {record ? "Đổi trạng thái" : "Check-in"}
            </Button>
            {record && (
              <Button
                variant="secondary"
                disabled={actions.pending}
                onClick={actions.checkOut}
              >
                <LogOut aria-hidden="true" />
                Check-out
              </Button>
            )}
          </div>
          {blockedByNetwork && (
            <p className={styles.warn} role="alert">
              Chọn “Tại văn phòng” cần kết nối wifi văn phòng. Hãy chọn Remote
              hoặc Công tác nếu bạn làm việc bên ngoài.
            </p>
          )}
        </>
      )}
      {actions.error && (
        <p className="error" role="alert">
          {actions.error}
        </p>
      )}
    </section>
  );
}
