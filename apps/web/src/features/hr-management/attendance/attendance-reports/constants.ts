export const statusLabels = {
  DRAFT: "Đang tổng hợp",
  CLOSED: "Đã chốt",
} as const;

export const definition = {
  id: "hr-management/attendance-reports",
  icon: 9,
  label: "Báo cáo chấm công",
  title: "Báo cáo chấm công",
  singular: "kỳ công",
  dateLabel: "Kỳ công",
  personLabel: "Nhân sự",
  tabs: [],
  sections: [],
  statuses: ["DRAFT", "CLOSED"],
  fields: [],
  navigation: {
    title: "Báo cáo chấm công",
    collapsed: false,
    defaultSection: "Kỳ công",
    allSection: "Kỳ công",
    items: [
      { label: "Kỳ công", href: "/hr-management/attendance-reports" },
      {
        label: "Bảng công",
        href: "/hr-management/attendance-reports?tab=lines&section=Bảng công",
      },
    ],
  },
} as const;
