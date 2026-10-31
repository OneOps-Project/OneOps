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

export const typeLabels = {
  FORGOT_CHECKIN: "Quên chấm công vào",
  MISSED_CHECKOUT: "Quên chấm công ra",
  WRONG_TIME: "Sai giờ chấm công",
  OTHER: "Khác",
} as const;

export const definition = {
  id: "hr-management/explanations",
  icon: 7,
  label: "Giải trình chấm công",
  title: "Giải trình chấm công",
  singular: "đơn giải trình",
  dateLabel: "Ngày làm việc",
  personLabel: "Nhân sự",
  tabs: [],
  sections: [],
  statuses: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
  fields: [],
  navigation: {
    title: "Giải trình",
    collapsed: false,
    defaultSection: "Đơn giải trình",
    allSection: "Đơn giải trình",
    items: [{ label: "Đơn giải trình", href: "/hr-management/explanations" }],
  },
} as const;
