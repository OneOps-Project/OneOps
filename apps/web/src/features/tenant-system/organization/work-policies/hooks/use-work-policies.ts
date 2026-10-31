"use client";
import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/tenant-system/organization/work-policies/api/client";
import type {
  HolidayDto,
  NetworkDto,
  PolicyDto,
  QuotaDto,
} from "@/features/tenant-system/organization/work-policies/types";

const event = "oneops-work-policies-changed";

export function workPoliciesChanged() {
  window.dispatchEvent(new Event(event));
}

function useCollection<T>(load: (signal: AbortSignal) => Promise<T[]>) {
  const [state, setState] = useState<{
    items: T[];
    loading: boolean;
    error: string;
  }>({ items: [], loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    window.addEventListener(event, reload);
    return () => window.removeEventListener(event, reload);
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((items) => setState({ items, loading: false, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            items: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Không tải được dữ liệu chính sách",
          });
      });
    return () => controller.abort();
  }, [load, revision]);
  return { ...state, reload };
}

export function usePolicy() {
  const [state, setState] = useState<{
    policy: PolicyDto | null;
    loading: boolean;
    error: string;
  }>({ policy: null, loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    window.addEventListener(event, reload);
    return () => window.removeEventListener(event, reload);
  }, [reload]);
  useEffect(() => {
    const controller = new AbortController();
    client
      .readPolicy(controller.signal)
      .then((policy) => setState({ policy, loading: false, error: "" }))
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            policy: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Không tải được chính sách làm việc",
          });
      });
    return () => controller.abort();
  }, [revision]);
  return { ...state, reload };
}

export const useHolidays = () => useCollection<HolidayDto>(client.listHolidays);
export const useNetworks = () => useCollection<NetworkDto>(client.listNetworks);
export const useQuotas = () => useCollection<QuotaDto>(client.listQuotas);
