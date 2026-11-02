"use client";
import { useEffect, useState, useCallback } from "react";
import type { RecordDto } from "@/features/hr-management/organization/positions-grades/types";
import { client } from "@/features/hr-management/organization/positions-grades/api/client";

const event = "oneops-positions-grades-changed";

export function recordsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(event));
  }
}

export function useModuleRecords() {
  const [state, setState] = useState<{
    records: RecordDto[];
    loading: boolean;
    error: string;
  }>({ records: [], loading: true, error: "" });
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((v) => v + 1), []);

  useEffect(() => {
    window.addEventListener(event, reload);
    return () => window.removeEventListener(event, reload);
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    client
      .list(controller.signal)
      .then((records) => setState({ records, loading: false, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            records: [],
            loading: false,
            error:
              error instanceof Error ? error.message : "Không tải được dữ liệu",
          });
      });
    return () => controller.abort();
  }, [revision]);

  return { ...state, reload };
}

