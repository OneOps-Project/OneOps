"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/attendance/workforce-board/api/client";
import type {
  PresenceDto,
  Summary,
} from "@/features/hr-management/attendance/workforce-board/types";

const event = "oneops-workforce-changed";

export function workforceChanged() {
  window.dispatchEvent(new Event(event));
}

const empty: Summary = { workDate: "", items: [], total: 0 };

export function useWorkforce(params: Record<string, string>) {
  const [state, setState] = useState<{
    items: PresenceDto[];
    total: number;
    summary: Summary;
    loading: boolean;
    error: string;
  }>({ items: [], total: 0, summary: empty, loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const key = JSON.stringify(params);

  useEffect(() => {
    window.addEventListener(event, reload);
    return () => window.removeEventListener(event, reload);
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    const filters = JSON.parse(key) as Record<string, string>;
    Promise.all([
      client.list(filters, controller.signal),
      client.summary(filters.workDate ?? "", controller.signal),
    ])
      .then(([list, summary]) =>
        setState({
          items: list.items,
          total: list.total,
          summary,
          loading: false,
          error: "",
        }),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            items: [],
            total: 0,
            summary: empty,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Không tải được bảng lực lượng",
          });
      });
    return () => controller.abort();
  }, [key, revision]);

  return { ...state, reload };
}
