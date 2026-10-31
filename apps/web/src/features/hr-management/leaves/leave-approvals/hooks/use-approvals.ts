"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/leaves/leave-approvals/api/client";
import type {
  DecisionDto,
  QueueItem,
} from "@/features/hr-management/leaves/leave-approvals/types";

const event = "oneops-leave-approvals-changed";

export function leaveApprovalsChanged() {
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

export function useApprovalQueue() {
  const [state, setState] = useState<{
    items: QueueItem[];
    loading: boolean;
    error: string;
  }>({ items: [], loading: true, error: "" });
  const { revision, reload } = useReload();

  useEffect(() => {
    const controller = new AbortController();
    client
      .queue(controller.signal)
      .then((items) => setState({ items, loading: false, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            items: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Không tải được hàng đợi duyệt",
          });
      });
    return () => controller.abort();
  }, [revision]);

  return { ...state, reload };
}

export function useApprovalHistory(params: Record<string, string>) {
  const [state, setState] = useState<{
    items: DecisionDto[];
    total: number;
    loading: boolean;
    error: string;
  }>({ items: [], total: 0, loading: true, error: "" });
  const { revision, reload } = useReload();
  const key = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    client
      .history(JSON.parse(key) as Record<string, string>, controller.signal)
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
                : "Không tải được lịch sử duyệt",
          });
      });
    return () => controller.abort();
  }, [key, revision]);

  return { ...state, reload };
}
