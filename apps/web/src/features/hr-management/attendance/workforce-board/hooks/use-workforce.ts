"use client";
import { useCallback, useEffect, useState } from "react";
import type { Workforce } from "@/features/hr-management/attendance/workforce-board/types";
import { client } from "@/features/hr-management/attendance/workforce-board/api/client";
export function useWorkforce(date: string) {
  const [revision, setRevision] = useState(0);
  const key = `${date}:${revision}`;
  const [state, setState] = useState<{
    key: string;
    data: Workforce | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    client
      .today(date, controller.signal)
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
  }, [date, key]);
  const loading = state.key !== key;
  return {
    data: state.data,
    loading,
    error: loading ? "" : state.error,
    reload,
  };
}
export function useReminder() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const remind = useCallback(
    async (employeeIds: string[]) => {
      if (pending || !employeeIds.length) return;
      setPending(true);
      setMessage("");
      try {
        const { sent } = await client.remind(employeeIds);
        setMessage(`Đã gửi nhắc check-in cho ${sent} nhân viên.`);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Không gửi được lời nhắc",
        );
      } finally {
        setPending(false);
      }
    },
    [pending],
  );
  return { remind, pending, message };
}
