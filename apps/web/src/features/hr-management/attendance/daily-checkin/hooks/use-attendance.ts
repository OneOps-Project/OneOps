"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CheckInInput,
  Colleagues,
  MonthAttendance,
  Today,
} from "@/features/hr-management/attendance/daily-checkin/types";
import { client } from "@/features/hr-management/attendance/daily-checkin/api/client";

const event = "oneops-my-attendance-changed";
function attendanceChanged() {
  window.dispatchEvent(new Event(event));
}
function errorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === "ZodError")
    return "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.";
  return error instanceof Error ? error.message : fallback;
}

function useResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [revision, setRevision] = useState(0);
  const fullKey = `${key}:${revision}`;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const loader = useRef(load);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    loader.current = load;
  });
  useEffect(() => {
    window.addEventListener(event, reload);
    return () => window.removeEventListener(event, reload);
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    loader
      .current(controller.signal)
      .then((data) => setState({ key: fullKey, data, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key: fullKey,
            data: null,
            error: errorText(error, "Không tải được dữ liệu"),
          });
      });
    return () => controller.abort();
  }, [fullKey]);
  const loading = state.key !== fullKey;
  return {
    data: state.data,
    loading,
    error: loading ? "" : state.error,
    reload,
  };
}

export const useToday = () =>
  useResource<Today>("today", (signal) => client.today(signal));
export const useMonthAttendance = (month: string) =>
  useResource<MonthAttendance>(month, (signal) => client.month(month, signal));
export const useColleagues = () =>
  useResource<Colleagues>("colleagues", (signal) => client.colleagues(signal));

export function useCheckInActions() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      if (pending) return false;
      setPending(true);
      setError("");
      try {
        await action();
        attendanceChanged();
        return true;
      } catch (e) {
        setError(errorText(e, "Không thể gửi điểm danh"));
        return false;
      } finally {
        setPending(false);
      }
    },
    [pending],
  );
  return {
    pending,
    error,
    clearError: () => setError(""),
    checkIn: (input: CheckInInput) => run(() => client.checkIn(input)),
    changeStatus: (input: CheckInInput) =>
      run(() => client.changeStatus(input)),
    checkOut: () => run(() => client.checkOut()),
  };
}
