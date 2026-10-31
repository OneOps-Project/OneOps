"use client";
import { useCallback, useEffect, useState } from "react";
import { links } from "@/features/work-management/work/tasks/api/links";
import type { TaskNeighborhood } from "@/features/work-management/work/tasks/types";

/** Both directions of one task's links, reloaded after every change. */
export function useTaskLinks(taskId: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    data: TaskNeighborhood | null;
    error: string;
    key: string;
  }>({ data: null, error: "", key: "" });
  const key = `${taskId}:${revision}`;
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    links
      .neighborhood(taskId, controller.signal)
      .then((data) => setState({ data, error: "", key }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          error:
            cause instanceof Error
              ? cause.message
              : "Không tải được liên kết công việc.",
          key,
        });
      });
    return () => controller.abort();
  }, [taskId, key]);

  return {
    data: state.data,
    error: state.error,
    loading: state.key !== key,
    reload,
  };
}
