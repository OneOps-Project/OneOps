export const statusLabels = {
  OPEN: "Chưa check-out",
  COMPLETE: "Đã đủ giờ vào/ra",
  LOCKED: "Đã chốt",
} as const;

export const sourceLabels = {
  WEB: "Web",
  MOBILE: "Di động",
  KIOSK: "Ki-ốt",
  MANUAL: "Nhập tay",
} as const;

export const statusTones = {
  OPEN: "warning",
  COMPLETE: "success",
  LOCKED: "info",
} as const;

export const definition = {
  id: "hr-management/attendance",
  icon: 7,
  label: "Chấm công hằng ngày",
  title: "Chấm công hằng ngày",
  singular: "lượt chấm công",
  dateLabel: "Ngày làm việc",
  personLabel: "Nhân sự",
  tabs: [],
  sections: [],
  statuses: ["OPEN", "COMPLETE", "LOCKED"],
  fields: [],
  navigation: {
    title: "Chấm công",
    collapsed: false,
    defaultSection: "Tất cả",
    allSection: "Tất cả",
    items: [
      { label: "Tất cả", href: "/hr-management/attendance" },
      {
        label: "Chưa check-out",
        href: "/hr-management/attendance?status=OPEN&section=Chưa check-out",
      },
      {
        label: "Đã đủ giờ",
        href: "/hr-management/attendance?status=COMPLETE&section=Đã đủ giờ",
      },
      {
        label: "Đã chốt",
        href: "/hr-management/attendance?status=LOCKED&section=Đã chốt",
      },
    ],
  },
} as const;
