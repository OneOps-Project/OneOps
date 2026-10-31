import type {
  AppliedAction,
  Condition,
  RuleDraft,
} from "@/features/tenant-system/automation-hub/workflow-rules/types";

export const definition = {
  id: "tenant-system/workflow-rules",
  icon: 12,
  label: "Quy tắc tự động",
  title: "Quy tắc tự động",
  singular: "quy tắc",
  dateLabel: "Lần chạy cuối",
  personLabel: "Phạm vi",
  tabs: [],
  sections: [],
  statuses: [],
  fields: [],
  navigation: {
    title: "Tự động hóa",
    collapsed: false,
    defaultSection: "Quy tắc",
    allSection: "Quy tắc",
    items: [
      { label: "Quy tắc", href: "/tenant-system/workflow-rules" },
      {
        label: "Lượt chạy",
        href: "/tenant-system/workflow-rules?tab=runs&section=Lượt chạy",
      },
      {
        label: "Chạy thử",
        href: "/tenant-system/workflow-rules?tab=simulate&section=Chạy thử",
      },
    ],
  },
} as const;

export const triggerLabels = {
  created: "Khi tạo mới",
  updated: "Khi cập nhật",
} as const;

export const fieldLabels = {
  status: "Trạng thái",
  assignee: "Người phụ trách",
  reviewer: "Người kiểm tra",
  scope: "Phạm vi",
  code: "Mã công việc",
  name: "Tiêu đề",
  date: "Hạn hoàn thành",
} as const;

export const operatorLabels = {
  is: "bằng",
  isNot: "khác",
  in: "thuộc danh sách",
  notIn: "không thuộc danh sách",
  contains: "chứa",
  exists: "có giá trị",
  changedTo: "đổi thành",
} as const;

export const actionLabels = {
  assign: "Giao cho người",
  status: "Chuyển trạng thái",
  comment: "Thêm bình luận",
  notify: "Gửi thông báo",
} as const;

export const outcomeLabels = {
  APPLIED: "Đã áp dụng",
  SKIPPED: "Bỏ qua",
  FAILED: "Lỗi",
  SIMULATED: "Mô phỏng",
} as const;

export const outcomeVariants = {
  APPLIED: "success",
  SKIPPED: "neutral",
  FAILED: "danger",
  SIMULATED: "info",
} as const;

export const messages = {
  load: "Không tải được danh sách quy tắc.",
  empty: "Chưa có quy tắc nào. Tạo quy tắc đầu tiên để bắt đầu tự động hóa.",
  saved: "Đã lưu quy tắc.",
  removed: "Đã xóa quy tắc.",
  toggled: "Đã đổi trạng thái quy tắc.",
  hint: "Mỗi lượt chỉ áp dụng một lần cho một công việc: quy tắc tự khóa công việc trong vài giây để tránh vòng lặp.",
};

/** One line per rule, used by the list and the dry-run result. */
export function summarizeCondition(condition: Condition) {
  return `${fieldLabels[condition.field]} ${operatorLabels[condition.operator]}${
    condition.operator === "exists" ? "" : ` “${condition.value}”`
  }`;
}

export function summarizeAction(
  action: AppliedAction | RuleDraft["actions"][number],
) {
  switch (action.kind) {
    case "assign":
      return `${actionLabels.assign} ${action.assignee}`;
    case "status":
      return `${actionLabels.status} ${action.status}`;
    case "comment":
      return `${actionLabels.comment}: ${action.body.slice(0, 60)}`;
    case "notify": {
      const recipients = Array.isArray(action.recipients)
        ? action.recipients.join(", ")
        : action.recipients;
      return `${actionLabels.notify} ${recipients}`;
    }
  }
}
