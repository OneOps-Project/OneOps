import type { DayStatus } from "@/features/hr-management/attendance/attendance-reports/types";
export const dayLegend: Record<DayStatus, { symbol: string; label: string }> = {
  present: { symbol: "X", label: "Tại văn phòng" },
  remote: { symbol: "R", label: "Remote" },
  business: { symbol: "CT", label: "Công tác" },
  leave: { symbol: "P", label: "Nghỉ phép" },
  absent: { symbol: "V", label: "Vắng" },
  holiday: { symbol: "L", label: "Nghỉ lễ" },
  weekend: { symbol: "", label: "Cuối tuần" },
};
