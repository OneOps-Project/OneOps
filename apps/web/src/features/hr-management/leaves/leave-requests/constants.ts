export const statusLabels = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
} as const;

export const statusTones = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
} as const;

export const leaveTypeLabels = {
  ANNUAL: "Nghỉ phép năm",
  SICK: "Nghỉ ốm",
  UNPAID: "Nghỉ không lương",
  OTHER: "Khác",
} as const;

export const definition = {
  id: "hr-management/leaves",
  icon: 2,
  label: "Đơn nghỉ phép",
  title: "Đơn nghỉ phép",
  singular: "đơn nghỉ",
  dateLabel: "Ngày nghỉ",
  personLabel: "Nhân sự",
  tabs: [],
  sections: [],
  statuses: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
  fields: [],
  navigation: {
    title: "Nghỉ phép",
    collapsed: false,
    defaultSection: "Đơn của tôi",
    allSection: "Đơn của tôi",
    items: [
      { label: "Đơn của tôi", href: "/hr-management/leaves" },
      {
        label: "Duyệt nghỉ phép",
        href: "/hr-management/leave-approvals",
      },
    ],
  },
} as const;
