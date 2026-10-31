export const statusLabels = {
  ACTIVE: "Đang áp dụng",
  INACTIVE: "Ngừng áp dụng",
} as const;

export const weekdayLabels = {
  1: "Thứ hai",
  2: "Thứ ba",
  3: "Thứ tư",
  4: "Thứ năm",
  5: "Thứ sáu",
  6: "Thứ bảy",
  7: "Chủ nhật",
} as const;

export const sourceLabels = {
  MANUAL: "Gán tay",
  PATTERN: "Theo mẫu tuần",
} as const;

export const definition = {
  id: "hr-management/shifts",
  icon: 3,
  label: "Ca & lịch làm việc",
  title: "Ca & lịch làm việc",
  singular: "ca làm",
  dateLabel: "Ngày làm việc",
  personLabel: "Nhân sự",
  tabs: [],
  sections: [],
  statuses: ["ACTIVE", "INACTIVE"],
  fields: [],
  navigation: {
    title: "Ca & lịch",
    collapsed: false,
    defaultSection: "Ca làm",
    allSection: "Ca làm",
    items: [
      { label: "Ca làm", href: "/hr-management/shifts" },
      {
        label: "Mẫu tuần",
        href: "/hr-management/shifts?tab=patterns&section=Mẫu tuần",
      },
      {
        label: "Lịch gán",
        href: "/hr-management/shifts?tab=assignments&section=Lịch gán",
      },
    ],
  },
} as const;
