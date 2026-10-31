"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/attendance/shifts-schedules/api/client";
import type {
  AssignmentDto,
  PatternDto,
  ShiftDto,
} from "@/features/hr-management/attendance/shifts-schedules/types";

const event = "oneops-shifts-changed";

export function shiftsChanged() {
  window.dispatchEvent(new Event(event));
}

type Page<T> = { items: T[]; total: number };

function useList<T>(
  fetcher: (
    params: Record<string, string>,
    signal?: AbortSignal,
  ) => Promise<Page<T>>,
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

export function useShifts(params: Record<string, string>) {
  return useList<ShiftDto>(
    client.listShifts,
    params,
    "Không tải được danh sách ca làm",
  );
}

export function usePatterns(params: Record<string, string>) {
  return useList<PatternDto>(
    client.listPatterns,
    params,
    "Không tải được mẫu tuần",
  );
}

export function useAssignments(params: Record<string, string>) {
  return useList<AssignmentDto>(
    client.listAssignments,
    params,
    "Không tải được lịch gán ca",
  );
}
