"use client";
import { z } from "zod";
import { useEffect, useState, useCallback } from "react";
import { checklogApi } from "../api/client";
import { ApiError } from "../api/http";
import type { AuditFilters, EventsPage, FilterOptions } from "../types";
export function useChecklog(filters: AuditFilters, page: number) {
  const [data, setData] = useState<EventsPage | null>(null);
  const [options, setOptions] = useState<FilterOptions>({
    modules: [],
    actions: [],
    entityTypes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [revision, setRevision] = useState(0);
  const deny = useCallback(() => {
    setData(null);
    setDenied(true);
    setLoading(false);
  }, []);
  const reload = useCallback(() => {
    setLoading(true);
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void checklogApi
      .filters(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setOptions(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          if (
            error instanceof ApiError &&
            (error.status === 401 || error.status === 403)
          ) {
            setDenied(true);
            setData(null);
          }
          setError(error.message);
        }
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      if (filters.from && filters.to && filters.from > filters.to) {
        setData(null);
        setError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
        setLoading(false);
        return;
      }
      if (
        filters.entityId &&
        !z.uuid().safeParse(filters.entityId.trim()).success
      ) {
        setData(null);
        setError("ID đối tượng phải là UUID hợp lệ.");
        setLoading(false);
        return;
      }
      void checklogApi
        .search(filters, page, controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) {
            setData(value);
            setDenied(false);
          }
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setData(null);
          setDenied(
            error instanceof ApiError &&
              (error.status === 401 || error.status === 403),
          );
          setError(
            error instanceof Error ? error.message : "Không tải được nhật ký.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, page, revision]);
  return { data, options, loading, error, denied, reload, deny };
}
