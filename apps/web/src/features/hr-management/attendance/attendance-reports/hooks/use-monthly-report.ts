"use client";
import { useCallback, useEffect, useState } from "react";
import type { MonthlyReport } from "@/features/hr-management/attendance/attendance-reports/types";
import { client } from "@/features/hr-management/attendance/attendance-reports/api/client";
export function useMonthlyReport(month: string, groupId: string) {
  const [revision, setRevision] = useState(0);
  const key = `${month}:${groupId}:${revision}`;
  const [state, setState] = useState<{
    key: string;
    data: MonthlyReport | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    client
      .monthly(month, groupId, controller.signal)
      .then((data) => setState({ key, data, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            error:
              error instanceof Error ? error.message : "Không tải được dữ liệu",
          });
      });
    return () => controller.abort();
  }, [month, groupId, key]);
  const loading = state.key !== key;
  return {
    data: state.data,
    loading,
    error: loading ? "" : state.error,
    reload,
  };
}
