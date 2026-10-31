export const statusLabels = {
  IN_OFFICE: "Tại văn phòng",
  REMOTE: "Làm từ xa",
  LEAVE: "Nghỉ phép",
  OFF_SITE: "Công tác ngoài",
} as const;

export const statusTones = {
  IN_OFFICE: "success",
  REMOTE: "info",
  LEAVE: "warning",
  OFF_SITE: "neutral",
} as const;

export const definition = {
  id: "hr-management/workforce",
  icon: 1,
  label: "Bảng lực lượng",
  title: "Bảng lực lượng",
  singular: "lượt hiện diện",
  dateLabel: "Ngày",
  personLabel: "Nhân sự",
  tabs: [],
  sections: [],
  statuses: ["IN_OFFICE", "REMOTE", "LEAVE", "OFF_SITE"],
  fields: [],
  navigation: {
    title: "Bảng lực lượng",
    collapsed: false,
    defaultSection: "Hiện diện",
    allSection: "Hiện diện",
    items: [{ label: "Hiện diện", href: "/hr-management/workforce" }],
  },
} as const;
