export const statusLabels = {
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
} as const;

export const statusTones = {
  APPROVED: "success",
  REJECTED: "danger",
} as const;

export const leaveTypeLabels = {
  ANNUAL: "Nghỉ phép năm",
  SICK: "Nghỉ ốm",
  UNPAID: "Nghỉ không lương",
  OTHER: "Khác",
} as const;

export const definition = {
  id: "hr-management/leave-approvals",
  icon: 6,
  label: "Duyệt nghỉ phép",
  title: "Duyệt nghỉ phép",
  singular: "đơn chờ duyệt",
  dateLabel: "Ngày nghỉ",
  personLabel: "Nhân sự",
  tabs: [],
  sections: [],
  statuses: ["APPROVED", "REJECTED"],
  fields: [],
  navigation: {
    title: "Nghỉ phép",
    collapsed: false,
    defaultSection: "Chờ duyệt",
    allSection: "Chờ duyệt",
    items: [
      { label: "Đơn của tôi", href: "/hr-management/leaves" },
      {
        label: "Duyệt nghỉ phép",
        href: "/hr-management/leave-approvals",
      },
    ],
  },
} as const;
