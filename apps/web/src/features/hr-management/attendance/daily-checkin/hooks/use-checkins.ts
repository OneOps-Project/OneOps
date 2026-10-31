"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/attendance/daily-checkin/api/client";
import type { AttendanceDto } from "@/features/hr-management/attendance/daily-checkin/types";

const event = "oneops-daily-checkin-changed";

export function checkinChanged() {
  window.dispatchEvent(new Event(event));
}

export function useCheckins(params: Record<string, string>) {
  const [state, setState] = useState<{
    items: AttendanceDto[];
    total: number;
    loading: boolean;
    error: string;
  }>({ items: [], total: 0, loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const key = JSON.stringify(params);
  useEffect(() => {
    window.addEventListener(event, reload);
    return () => window.removeEventListener(event, reload);
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    client
      .list(JSON.parse(key) as Record<string, string>, controller.signal)
      .then((result) =>
        setState({
          items: result.items,
          total: result.total,
          loading: false,
          error: "",
        }),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            items: [],
            total: 0,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Không tải được dữ liệu chấm công",
          });
      });
    return () => controller.abort();
  }, [key, revision]);
  return { ...state, reload };
}
