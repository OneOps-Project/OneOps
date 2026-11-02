// TODO: [INTEGRATION] - Point these fetch functions to the real Accounts API (e.g., GET /api/accounts/users) once deployed.

export type MockAccount = { id: string; name: string };

export const mockUsers: MockAccount[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Nguyễn Văn A",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Trần Thị B",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Lê Văn C",
  },
];

export const mockGroups: MockAccount[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    name: "Ban Giám Đốc",
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    name: "Nhân sự",
  },
];

export async function fetchMockUsers(): Promise<MockAccount[]> {
  return mockUsers;
}

export async function fetchMockGroups(): Promise<MockAccount[]> {
  return mockGroups;
}

export function accountName(id: string, accounts: MockAccount[]) {
  return accounts.find((account) => account.id === id)?.name ?? id;
}

export function accountOptions(accounts: MockAccount[], selectedIds: string[]) {
  const knownIds = new Set(accounts.map((account) => account.id));
  const preserved = selectedIds
    .filter((id) => !knownIds.has(id))
    .map((id) => ({ id, name: id }));
  return [...accounts, ...preserved];
}
