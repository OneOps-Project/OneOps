import type {
  AttendanceFlag,
  WorkStatus,
} from "@/features/hr-management/attendance/workforce-board/types";
export const statusLabels: Record<WorkStatus, string> = {
  office: "Tại văn phòng",
  business: "Công tác / gặp khách",
  remote: "Remote",
  absent: "Chưa điểm danh",
  leave: "Nghỉ phép",
};
export const statusVariants = {
  office: "success",
  business: "info",
  remote: "brand",
  absent: "danger",
  leave: "neutral",
} as const satisfies Record<WorkStatus, string>;
export const flagLabels: Record<AttendanceFlag, string> = {
  late: "Đi muộn",
  early: "Về sớm",
  "missing-checkout": "Thiếu check-out",
};
