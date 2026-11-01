"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultMockAuthIdentity,
  getMockAuthIdentity,
  setMockAuthIdentity,
  type MockAuthIdentity,
} from "@/features/hr-management/organization/departments-teams/api/http";
import { MockDataWarning } from "@/features/hr-management/organization/departments-teams/components/mock-data-warning";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export type MockAuthRole = "MANAGER" | "EMPLOYEE";

export type MockAuthUser = MockAuthIdentity;

const mockRoles: Array<MockAuthUser & { key: string; label: string }> = [
  {
    ...defaultMockAuthIdentity,
    key: "SUPER_ADMIN",
    label: "Quản trị cấp cao",
  },
  {
    id: "00000000-0000-4000-8000-000000000101",
    role: "MANAGER",
    isSuperAdmin: false,
    permissions: [],
    key: "MANAGER",
    label: "Quản lý",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    role: "EMPLOYEE",
    isSuperAdmin: false,
    permissions: [],
    key: "EMPLOYEE",
    label: "Nhân viên",
  },
];

type MockAuthValue = {
  user: MockAuthUser | null;
  roleLabel: string;
  canCreateDepartment: boolean;
  canManageDepartment: (administratorIds: string[]) => boolean;
  canCreateTeam: (
    administratorIds: string[],
    accessUserIds: string[],
  ) => boolean;
  canManageTeam: (
    managerIds: string[],
    departmentAdministratorIds: string[],
  ) => boolean;
  isEmployee: boolean;
};

const MockAuthContext = createContext<MockAuthValue | null>(null);
const mockAuthEnabled = process.env.NODE_ENV !== "production";

export function MockAuthProvider({
  children,
  showSwitcher = true,
  showWarning = true,
}: {
  children: React.ReactNode;
  showSwitcher?: boolean;
  showWarning?: boolean;
}) {
  const [user, setUser] = useState<MockAuthUser | null>(
    mockAuthEnabled ? (getMockAuthIdentity() ?? mockRoles[0]) : null,
  );

  useLayoutEffect(() => {
    setMockAuthIdentity(mockAuthEnabled ? user : null);
  }, [user]);

  const value = useMemo<MockAuthValue>(
    () => ({
      user,
      roleLabel:
        mockRoles.find(
          (entry) =>
            entry.key === (user?.isSuperAdmin ? "SUPER_ADMIN" : user?.role),
        )?.label ?? "Chưa đăng nhập",
      canCreateDepartment:
        user?.isSuperAdmin === true ||
        (user?.role === "MANAGER" &&
          user.permissions.includes("organization.department.create")),
      canManageDepartment: (administratorIds) =>
        user?.isSuperAdmin === true ||
        (user?.role === "MANAGER" && administratorIds.includes(user.id)),
      canCreateTeam: (administratorIds, accessUserIds) =>
        user?.isSuperAdmin === true ||
        (user?.role === "MANAGER" &&
          (administratorIds.includes(user.id) ||
            accessUserIds.includes(user.id))),
      canManageTeam: (managerIds, departmentAdministratorIds) =>
        user?.isSuperAdmin === true ||
        (user?.role === "MANAGER" &&
          (managerIds.includes(user.id) ||
            departmentAdministratorIds.includes(user.id))),
      isEmployee: user?.role === "EMPLOYEE",
    }),
    [user],
  );

  return (
    <MockAuthContext.Provider value={value}>
      {mockAuthEnabled && showWarning && <MockDataWarning />}
      {children}
      {mockAuthEnabled && showSwitcher && (
        <div className={styles.mockAuthSwitcher}>
          <label htmlFor="organization-mock-role">Vai trò mô phỏng</label>
          <select
            id="organization-mock-role"
            className={styles.select}
            value={user?.isSuperAdmin ? "SUPER_ADMIN" : (user?.role ?? "")}
            onChange={(event) => {
              const next = mockRoles.find(
                (entry) => entry.key === event.target.value,
              );
              if (next)
                setUser({
                  id: next.id,
                  role: next.role,
                  isSuperAdmin: next.isSuperAdmin,
                  permissions: next.permissions,
                });
            }}
          >
            {mockRoles.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
          {user?.role === "MANAGER" && !user.isSuperAdmin && (
            <label>
              <input
                type="checkbox"
                checked={user.permissions.includes(
                  "organization.department.create",
                )}
                onChange={(event) =>
                  setUser({
                    ...user,
                    permissions: event.target.checked
                      ? ["organization.department.create"]
                      : [],
                  })
                }
              />
              Được cấp quyền tạo Department (mock)
            </label>
          )}
          <small>{user?.id}</small>
        </div>
      )}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (!context)
    throw new Error("useMockAuth phải được dùng trong MockAuthProvider.");
  return context;
}
