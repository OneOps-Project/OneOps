import type {
  AttendanceFlag,
  DayStatus,
  WorkMode,
} from "@/features/hr-management/attendance/daily-checkin/types";

export const definition = {
  id: "hr-management/attendance",
  icon: 5,
  label: "Điểm danh",
  title: "Điểm danh",
  navigation: {
    title: "Điểm danh",
    collapsed: false,
    defaultSection: "Điểm danh của tôi",
    allSection: "",
    items: [
      {
        label: "Điểm danh của tôi",
        href: "/hr-management/attendance?section=Điểm danh của tôi",
      },
      {
        label: "Quân số hôm nay",
        href: "/hr-management/attendance?section=Quân số hôm nay",
      },
      {
        label: "Duyệt giải trình",
        href: "/hr-management/attendance?section=Duyệt giải trình",
      },
      {
        label: "Bảng điểm danh tháng",
        href: "/hr-management/attendance?section=Bảng điểm danh tháng",
      },
    ],
  },
} as const;

export const modeOptions: {
  value: WorkMode;
  label: string;
  placeholder: string;
}[] = [
  {
    value: "office",
    label: "Tại văn phòng",
    placeholder: "Ghi chú (không bắt buộc)",
  },
  {
    value: "business",
    label: "Công tác / gặp khách",
    placeholder: "Địa điểm công tác (bắt buộc)",
  },
  {
    value: "remote",
    label: "Remote",
    placeholder: "Đầu việc hôm nay (không bắt buộc)",
  },
];

export const statusLabels: Record<DayStatus | "absent", string> = {
  office: "Tại văn phòng",
  business: "Công tác / gặp khách",
  remote: "Remote",
  leave: "Nghỉ phép",
  absent: "Chưa điểm danh",
  holiday: "Nghỉ lễ",
};

export const statusVariants = {
  office: "success",
  business: "info",
  remote: "brand",
  leave: "neutral",
  absent: "danger",
  holiday: "neutral",
} as const satisfies Record<DayStatus, string>;

export const flagLabels: Record<AttendanceFlag, string> = {
  late: "Đi muộn",
  early: "Về sớm",
  "missing-checkout": "Thiếu check-out",
};
