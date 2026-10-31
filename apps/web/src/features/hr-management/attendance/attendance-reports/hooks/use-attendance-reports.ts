"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/attendance/attendance-reports/api/client";
import type {
  LineDto,
  PeriodDto,
  Summary,
} from "@/features/hr-management/attendance/attendance-reports/types";

const event = "oneops-attendance-reports-changed";

export function attendanceReportsChanged() {
  window.dispatchEvent(new Event(event));
}

function useList<T>(
  fetcher: (
    params: Record<string, string>,
    signal?: AbortSignal,
  ) => Promise<{
    items: T[];
    total: number;
  }>,
  params: Record<string, string>,
  fallback: string,
) {
  const [state, setState] = useState<{
    items: T[];
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
    fetcher(JSON.parse(key) as Record<string, string>, controller.signal)
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
            error: error instanceof Error ? error.message : fallback,
          });
      });
    return () => controller.abort();
  }, [key, revision, fetcher, fallback]);

  return { ...state, reload };
}

export function usePeriods(params: Record<string, string>) {
  return useList<PeriodDto>(
    client.listPeriods,
    params,
    "Không tải được kỳ công",
  );
}

export function useLines(params: Record<string, string>) {
  return useList<LineDto>(client.listLines, params, "Không tải được bảng công");
}

export function useSummary(periodId: string) {
  // Kết quả gắn với kỳ đã tải để đổi kỳ không hiển thị số liệu cũ.
  const [entry, setEntry] = useState<{ key: string; value: Summary | null }>({
    key: "",
    value: null,
  });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    window.addEventListener(event, reload);
    return () => window.removeEventListener(event, reload);
  }, [reload]);

  useEffect(() => {
    if (!periodId) return;
    const controller = new AbortController();
    client
      .summary(periodId, controller.signal)
      .then((result) => setEntry({ key: periodId, value: result }))
      .catch(() => {
        if (!controller.signal.aborted)
          setEntry({ key: periodId, value: null });
      });
    return () => controller.abort();
  }, [periodId, revision]);

  return { summary: entry.key === periodId ? entry.value : null, reload };
}
