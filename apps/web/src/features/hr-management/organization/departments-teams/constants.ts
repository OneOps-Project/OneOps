export const definition = {
  id: "hr-management/organization/departments",
  icon: 8,
  label: "Phòng ban & Team",
  title: "Phòng ban & Team",
  navigation: {
    title: "Tổ chức",
    collapsed: false,
    defaultSection: "Phòng ban",
    allSection: "Phòng ban",
    items: [
      {
        label: "Phòng ban",
        href: "/hr-management/organization/departments",
      },
    ],
  },
} as const;
