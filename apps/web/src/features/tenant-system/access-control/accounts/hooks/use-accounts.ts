"use client";
import { useCallback, useEffect, useState } from "react";
import { accountsApi } from "../api/client";
import { ApiError } from "../api/http";
import type { Account, AccountGroup, Actor } from "../types";
export function useAccounts(
  query: string,
  role: string,
  status: string,
  page: number,
  view: string,
) {
  const [actor, setActor] = useState<Actor | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [rows, setRows] = useState<Account[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => {
    setLoading(true);
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    const onChanged = () => reload();
    window.addEventListener("oneops-accounts-changed", onChanged);
    return () =>
      window.removeEventListener("oneops-accounts-changed", onChanged);
  }, [reload]);
  useEffect(() => {
    let active = true;
    const check = () =>
      accountsApi
        .me()
        .then((value) => {
          if (active) {
            setActor(value);
            setSessionChecked(true);
          }
        })
        .catch((reason) => {
          if (!active) return;
          setActor(null);
          setRows([]);
          setGroups([]);
          setSessionChecked(true);
          if (!(reason instanceof ApiError && reason.status === 401))
            setError(
              reason instanceof Error
                ? reason.message
                : "Không kiểm tra được phiên làm việc.",
            );
        });
    void check();
    const timer = setInterval(() => {
      void check();
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [revision]);
  useEffect(() => {
    if (!actor || !(actor.manageAccounts || actor.superAdmin)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        pageSize: "20",
      });
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      const load =
        view === "groups"
          ? accountsApi.groups(query, controller.signal).then((value) => {
              setGroups(value);
              setTotal(value.length);
            })
          : accountsApi.list(params, controller.signal).then((value) => {
              setRows(value.items);
              setTotal(value.total);
            });
      void load
        .catch((reason) => {
          if (controller.signal.aborted) return;
          if (
            reason instanceof ApiError &&
            (reason.status === 401 || reason.status === 403)
          ) {
            setRows([]);
            setGroups([]);
            setActor(null);
          }
          setError(
            reason instanceof Error
              ? reason.message
              : "Không tải được dữ liệu.",
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
  }, [actor, query, role, status, page, view, revision]);
  return {
    actor,
    setActor,
    sessionChecked,
    rows,
    groups,
    total,
    loading,
    error,
    reload,
  };
}
