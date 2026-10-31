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

export const definition = {
  id: "tenant-system/work-policies",
  icon: 3,
  label: "Chính sách làm việc",
  title: "Chính sách làm việc",
  singular: "ngày lễ",
  dateLabel: "Cập nhật",
  personLabel: "Phạm vi",
  tabs: [],
  sections: [],
  statuses: ["ACTIVE", "INACTIVE"],
  fields: [],
  navigation: {
    title: "Chính sách làm việc",
    collapsed: false,
    defaultSection: "Chung",
    allSection: "Chung",
    items: [
      { label: "Chung", href: "/tenant-system/work-policies" },
      {
        label: "Ngày lễ",
        href: "/tenant-system/work-policies?tab=holidays&section=Ngày lễ",
      },
      {
        label: "Mạng văn phòng",
        href: "/tenant-system/work-policies?tab=networks&section=Mạng văn phòng",
      },
      {
        label: "Hạn mức phép",
        href: "/tenant-system/work-policies?tab=quotas&section=Hạn mức phép",
      },
    ],
  },
} as const;
