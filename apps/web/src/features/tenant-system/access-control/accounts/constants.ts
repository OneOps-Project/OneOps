export const definition = {
  id: "tenant-system/accounts",
  icon: 1,
  label: "Tài khoản",
  title: "Quản lý tài khoản",
  singular: "tài khoản",
  dateLabel: "Ngày tạo",
  personLabel: "Nhân viên",
  tabs: [],
  sections: [],
  statuses: ["Hoạt động", "Đã khóa"],
  fields: [],
  navigation: {
    title: "Quản trị tài khoản",
    collapsed: true,
    defaultSection: "Tài khoản",
    allSection: "Tài khoản",
    items: [
      { label: "Tài khoản", href: "/tenant-system/accounts" },
      { label: "Nhóm tài khoản", href: "/tenant-system/accounts?view=groups" },
    ],
  },
} as const;
export const roleLabels = {
  EMPLOYEE: "Nhân viên",
  MANAGER: "Quản lý",
} as const;
export const statusLabels = { ACTIVE: "Hoạt động", LOCKED: "Đã khóa" } as const;
