"use client";

import { useEffect, useState } from "react";
import {
  fetchMockGroups,
  fetchMockUsers,
  type MockAccount,
} from "@/features/hr-management/organization/departments-teams/api/mock-accounts";

export function useMockAccounts() {
  const [accounts, setAccounts] = useState<{
    users: MockAccount[];
    groups: MockAccount[];
    loading: boolean;
    error: string;
  }>({ users: [], groups: [], loading: true, error: "" });

  useEffect(() => {
    let active = true;
    // TODO: [INTEGRATION] - Replace these mock account lookups with the Accounts API.
    Promise.all([fetchMockUsers(), fetchMockGroups()])
      .then(([users, groups]) => {
        if (active) setAccounts({ users, groups, loading: false, error: "" });
      })
      .catch((reason: unknown) => {
        if (active)
          setAccounts({
            users: [],
            groups: [],
            loading: false,
            error:
              reason instanceof Error
                ? reason.message
                : "Không tải được danh sách tài khoản.",
          });
      });
    return () => {
      active = false;
    };
  }, []);

  return accounts;
}
