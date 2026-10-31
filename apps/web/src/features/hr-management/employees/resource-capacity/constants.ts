export const allocationStatusLabels = {
  PLANNED: "Dự kiến",
  ACTIVE: "Đang thực hiện",
  CANCELLED: "Đã hủy",
} as const;

export const allocationStatusTones = {
  PLANNED: "info",
  ACTIVE: "success",
  CANCELLED: "neutral",
} as const;

export const definition = {
  id: "hr-management/capacity",
  icon: 8,
  label: "Công suất nguồn lực",
  title: "Công suất nguồn lực",
  singular: "kỳ công suất",
  dateLabel: "Kỳ tính",
  personLabel: "Nhân sự",
  tabs: [],
  sections: [],
  statuses: ["PLANNED", "ACTIVE", "CANCELLED"],
  fields: [],
  navigation: {
    title: "Công suất",
    collapsed: false,
    defaultSection: "Kỳ công suất",
    allSection: "Kỳ công suất",
    items: [
      { label: "Kỳ công suất", href: "/hr-management/capacity" },
      {
        label: "Phân bổ dự án",
        href: "/hr-management/capacity?tab=allocations&section=Phân bổ dự án",
      },
    ],
  },
} as const;
