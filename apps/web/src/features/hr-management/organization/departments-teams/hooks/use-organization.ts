"use client";

import { useCallback, useEffect, useState } from "react";
import { client } from "@/features/hr-management/organization/departments-teams/api/client";
import { subscribeOrganizationChanges } from "@/features/hr-management/organization/departments-teams/api/realtime";
import { useMockAuth } from "@/features/hr-management/organization/departments-teams/contexts/MockAuthContext";
import type {
  Department,
  HistoryEntry,
  PageResult,
  Team,
} from "@/features/hr-management/organization/departments-teams/types";

type ResourceState<T> = {
  key: string;
  data: T;
  loading: boolean;
  error: string;
};

function useResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  empty: T,
) {
  const { user } = useMockAuth();
  const requestKey = `${key}:${user?.id ?? "anonymous"}:${user?.role ?? "none"}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({
    key: requestKey,
    data: empty,
    loading: true,
    error: "",
  });
  const reload = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeOrganizationChanges(() => reload());
    return () => {
      unsubscribe();
    };
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key: requestKey, data, loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            key: requestKey,
            data: empty,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Không tải được dữ liệu.",
          });
      });
    return () => controller.abort();
  }, [empty, load, requestKey, revision]);

  return {
    ...(state.key === requestKey
      ? state
      : { key: requestKey, data: empty, loading: true, error: "" }),
    reload,
  };
}

const emptyDepartments: PageResult<Department> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
};
const emptyTeams: PageResult<Team> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
};
const emptyHistory: PageResult<HistoryEntry> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
};

export function useDepartments(query: {
  q?: string;
  status?: string;
  page?: number;
}) {
  const q = query.q;
  const status = query.status;
  const page = query.page;
  const load = useCallback(
    async (signal: AbortSignal) =>
      client.listDepartments({ q, status, page }, signal),
    [page, q, status],
  );
  return useResource(
    `departments:${q ?? ""}:${status ?? ""}:${page ?? 1}`,
    load,
    emptyDepartments,
  );
}

export function useDepartmentDetails(id: string) {
  const load = useCallback(
    async (signal: AbortSignal) => client.getDepartment(id, signal),
    [id],
  );
  return useResource(`department:${id}`, load, null as Department | null);
}

export function useDepartmentHistory(id: string, page = 1) {
  const load = useCallback(
    async (signal: AbortSignal) => client.departmentHistory(id, page, signal),
    [id, page],
  );
  return useResource(`department-history:${id}:${page}`, load, emptyHistory);
}

export function useTeams(
  departmentId: string,
  query: { q?: string; status?: string; page?: number } = {},
) {
  const q = query.q;
  const status = query.status;
  const page = query.page;
  const load = useCallback(
    async (signal: AbortSignal) =>
      client.listTeams(departmentId, { q, status, page }, signal),
    [departmentId, page, q, status],
  );
  return useResource(
    `teams:${departmentId}:${q ?? ""}:${status ?? ""}:${page ?? 1}`,
    load,
    emptyTeams,
  );
}

export function useTeamDetails(id: string) {
  const load = useCallback(
    async (signal: AbortSignal) => client.getTeam(id, signal),
    [id],
  );
  return useResource(`team:${id}`, load, null as Team | null);
}

export function useTeamHistory(id: string, page = 1) {
  const load = useCallback(
    async (signal: AbortSignal) => client.teamHistory(id, page, signal),
    [id, page],
  );
  return useResource(`team-history:${id}:${page}`, load, emptyHistory);
}
