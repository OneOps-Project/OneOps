import type {
  ExplanationIssue,
  ExplanationStatus,
} from "@/features/hr-management/attendance/checkin-explanations/types";
export const statusTabs: { key: ExplanationStatus; label: string }[] = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
];
export const issueLabels: Record<ExplanationIssue, string> = {
  early: "Về sớm",
  "missing-checkin": "Thiếu check-in",
  "missing-checkout": "Thiếu check-out",
};
