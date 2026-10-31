"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/attendance/checkin-explanations/api/client";
import type { ExplanationDto } from "@/features/hr-management/attendance/checkin-explanations/types";

const event = "oneops-explanations-changed";

export function explanationsChanged() {
  window.dispatchEvent(new Event(event));
}

export function useExplanations(params: Record<string, string>) {
  const [state, setState] = useState<{
    items: ExplanationDto[];
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
                : "Không tải được đơn giải trình",
          });
      });
    return () => controller.abort();
  }, [key, revision]);

  return { ...state, reload };
}
