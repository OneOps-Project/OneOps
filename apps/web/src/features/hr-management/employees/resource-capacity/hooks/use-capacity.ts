"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/employees/resource-capacity/api/client";
import type {
  AllocationDto,
  PeriodDto,
  Workload,
} from "@/features/hr-management/employees/resource-capacity/types";

const event = "oneops-capacity-changed";

export function capacityChanged() {
  window.dispatchEvent(new Event(event));
}

function useReload() {
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    window.addEventListener(event, reload);
    return () => window.removeEventListener(event, reload);
  }, [reload]);
  return { revision, reload };
}

export function usePeriods(params: Record<string, string>) {
  const [state, setState] = useState<{
    items: PeriodDto[];
    total: number;
    loading: boolean;
    error: string;
  }>({ items: [], total: 0, loading: true, error: "" });
  const { revision, reload } = useReload();
  const key = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    client
      .listPeriods(JSON.parse(key) as Record<string, string>, controller.signal)
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
                : "Không tải được kỳ công suất",
          });
      });
    return () => controller.abort();
  }, [key, revision]);

  return { ...state, reload };
}

export function useAllocations(params: Record<string, string>) {
  const [state, setState] = useState<{
    items: AllocationDto[];
    total: number;
    loading: boolean;
    error: string;
  }>({ items: [], total: 0, loading: true, error: "" });
  const { revision, reload } = useReload();
  const key = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    client
      .listAllocations(
        JSON.parse(key) as Record<string, string>,
        controller.signal,
      )
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
                : "Không tải được phân bổ dự án",
          });
      });
    return () => controller.abort();
  }, [key, revision]);

  return { ...state, reload };
}

export function useWorkload(periodId: string) {
  // Dữ liệu gắn với kỳ đã tải để đổi kỳ không hiển thị số liệu cũ.
  const [entry, setEntry] = useState<{
    key: string;
    data: Workload | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const { revision, reload } = useReload();

  useEffect(() => {
    if (!periodId) return;
    const controller = new AbortController();
    client
      .workload(periodId, controller.signal)
      .then((data) => setEntry({ key: periodId, data, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setEntry({
            key: periodId,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Không tính được công suất",
          });
      });
    return () => controller.abort();
  }, [periodId, revision]);

  const ready = Boolean(periodId) && entry.key === periodId;
  return {
    data: ready ? entry.data : null,
    loading: Boolean(periodId) && !ready,
    error: ready ? entry.error : "",
    reload,
  };
}
