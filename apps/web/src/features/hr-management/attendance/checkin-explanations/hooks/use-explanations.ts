"use client";
import { useCallback, useEffect, useState } from "react";
import type {
  Explanation,
  ExplanationStatus,
} from "@/features/hr-management/attendance/checkin-explanations/types";
import { client } from "@/features/hr-management/attendance/checkin-explanations/api/client";
export function useExplanations(status: ExplanationStatus) {
  const [revision, setRevision] = useState(0);
  const key = `${status}:${revision}`;
  const [state, setState] = useState<{
    key: string;
    items: Explanation[];
    error: string;
  }>({ key: "", items: [], error: "" });
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    client
      .list(status, controller.signal)
      .then((items) => setState({ key, items, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            items: [],
            error:
              error instanceof Error ? error.message : "Không tải được dữ liệu",
          });
      });
    return () => controller.abort();
  }, [status, key]);
  const loading = state.key !== key;
  return {
    items: state.items,
    loading,
    error: loading ? "" : state.error,
    reload,
  };
}
export function useReview(onDone: () => void) {
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const run = useCallback(
    async (item: Explanation, action: () => Promise<unknown>) => {
      if (pendingId) return false;
      setPendingId(item.id);
      setError("");
      try {
        await action();
        onDone();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không thể xử lý đơn");
        return false;
      } finally {
        setPendingId("");
      }
    },
    [pendingId, onDone],
  );
  return {
    pendingId,
    error,
    approve: (item: Explanation) => run(item, () => client.approve(item)),
    reject: (item: Explanation, note: string) =>
      run(item, () => client.reject(item, note)),
  };
}
