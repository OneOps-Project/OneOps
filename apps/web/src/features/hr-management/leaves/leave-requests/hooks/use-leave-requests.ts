"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/leaves/leave-requests/api/client";
import type { LeaveDto } from "@/features/hr-management/leaves/leave-requests/types";

const event = "oneops-leave-requests-changed";

export function leaveRequestsChanged() {
  window.dispatchEvent(new Event(event));
}

export function useLeaveRequests(params: Record<string, string>) {
  const [state, setState] = useState<{
    items: LeaveDto[];
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
                : "Không tải được đơn nghỉ phép",
          });
      });
    return () => controller.abort();
  }, [key, revision]);

  return { ...state, reload };
}
