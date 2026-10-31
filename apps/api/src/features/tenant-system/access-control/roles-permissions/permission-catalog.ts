import {
  PERMISSION_ACTIONS,
  type PermissionAction,
} from "../../../../core/auth/actor-context.js";

export type PermissionRole = "EMPLOYEE" | "MANAGER";
export type FeatureGroup =
  "tenant-system" | "work-management" | "hr-management" | "crm";

export interface CatalogEntry {
  key: string;
  group: FeatureGroup;
  label: string;
}

/**
 * Permission catalog mirrors the approved feature tree: one entry per branch that
 * can receive permissions. Calendar and reports live inside `workspace-today`, so
 * they inherit that branch instead of opening a second key.
 */
export const permissionCatalog: readonly CatalogEntry[] = [
  {
    key: "tenant-system/organization/company-profile",
    group: "tenant-system",
    label: "Hồ sơ công ty",
  },
  {
    key: "tenant-system/organization/work-policies",
    group: "tenant-system",
    label: "Chính sách làm việc",
  },
  {
    key: "tenant-system/access-control/tenant-auth",
    group: "tenant-system",
    label: "Đăng nhập",
  },
  {
    key: "tenant-system/access-control/roles-permissions",
    group: "tenant-system",
    label: "Phân quyền",
  },
  {
    key: "tenant-system/access-control/accounts",
    group: "tenant-system",
    label: "Tài khoản",
  },
  {
    key: "tenant-system/automation-hub/external-integrations",
    group: "tenant-system",
    label: "Kết nối ngoài",
  },
  {
    key: "tenant-system/automation-hub/workflow-rules",
    group: "tenant-system",
    label: "Quy tắc tự động",
  },
  {
    key: "tenant-system/automation-hub/ai-copilot",
    group: "tenant-system",
    label: "Trợ lý AI",
  },
  {
    key: "tenant-system/checklog",
    group: "tenant-system",
    label: "Nhật ký hệ thống",
  },
  {
    key: "work-management/work/tasks",
    group: "work-management",
    label: "Công việc",
  },
  {
    key: "work-management/work/task-workflow",
    group: "work-management",
    label: "Luồng trạng thái công việc",
  },
  {
    key: "work-management/work/task-comments",
    group: "work-management",
    label: "Bình luận công việc",
  },
  {
    key: "work-management/work/task-links",
    group: "work-management",
    label: "Liên kết & phụ thuộc công việc",
  },
  {
    key: "work-management/work/kanban",
    group: "work-management",
    label: "Bảng Kanban",
  },
  {
    key: "work-management/coordination/notifications",
    group: "work-management",
    label: "Thông báo",
  },
  {
    key: "work-management/coordination/internal-chat",
    group: "work-management",
    label: "Trao đổi nội bộ",
  },
  {
    key: "work-management/coordination/workspace-today",
    group: "work-management",
    label: "Tổng quan hôm nay",
  },
  {
    key: "work-management/coordination/tickets-approvals",
    group: "work-management",
    label: "Đề xuất & phê duyệt",
  },
  {
    key: "work-management/coordination/knowledge-sop",
    group: "work-management",
    label: "Ghi chú & SOP",
  },
  {
    key: "work-management/projects/project-spaces",
    group: "work-management",
    label: "Không gian dự án",
  },
  {
    key: "work-management/projects/milestones-qa",
    group: "work-management",
    label: "Mốc & QA",
  },
  {
    key: "work-management/projects/timesheets",
    group: "work-management",
    label: "Bảng công dự án",
  },
  {
    key: "hr-management/attendance/daily-checkin",
    group: "hr-management",
    label: "Chấm công hằng ngày",
  },
  {
    key: "hr-management/attendance/workforce-board",
    group: "hr-management",
    label: "Bảng lực lượng",
  },
  {
    key: "hr-management/attendance/checkin-explanations",
    group: "hr-management",
    label: "Giải trình chấm công",
  },
  {
    key: "hr-management/attendance/shifts-schedules",
    group: "hr-management",
    label: "Ca & lịch làm việc",
  },
  {
    key: "hr-management/attendance/attendance-reports",
    group: "hr-management",
    label: "Báo cáo chấm công",
  },
  {
    key: "hr-management/leaves/leave-requests",
    group: "hr-management",
    label: "Đơn nghỉ phép",
  },
  {
    key: "hr-management/leaves/leave-approvals",
    group: "hr-management",
    label: "Duyệt nghỉ phép",
  },
  {
    key: "hr-management/employees/employee-directory",
    group: "hr-management",
    label: "Danh bạ nhân sự",
  },
  {
    key: "hr-management/employees/resource-capacity",
    group: "hr-management",
    label: "Công suất nguồn lực",
  },
  {
    key: "hr-management/organization/departments-teams",
    group: "hr-management",
    label: "Phòng ban & nhóm",
  },
  {
    key: "hr-management/organization/positions-grades",
    group: "hr-management",
    label: "Chức danh & cấp bậc",
  },
  {
    key: "crm/presales/leads-customers",
    group: "crm",
    label: "Khách hàng tiềm năng",
  },
  {
    key: "crm/presales/discovery-briefs",
    group: "crm",
    label: "Khảo sát nhu cầu",
  },
  {
    key: "crm/commercial/quotations-sow",
    group: "crm",
    label: "Báo giá & SOW",
  },
  { key: "crm/commercial/contracts", group: "crm", label: "Hợp đồng" },
  { key: "crm/customer-success/receivables", group: "crm", label: "Công nợ" },
  {
    key: "crm/customer-success/customer-portal",
    group: "crm",
    label: "Cổng khách hàng",
  },
  { key: "crm/customer-success/after-sales", group: "crm", label: "Hậu mãi" },
];

/** The matrix feature owns the matrix: it stays read-only for managers. */
export const SELF_FEATURE = "tenant-system/access-control/roles-permissions";

/** `manage` is never stored; only system administrators hold it. */
export const assignableActions: readonly PermissionAction[] =
  PERMISSION_ACTIONS.filter((action) => action !== "manage");

const catalogIndex = new Map(
  permissionCatalog.map((entry, index) => [entry.key, index]),
);

export const catalogEntry = (key: string) =>
  permissionCatalog[catalogIndex.get(key) ?? -1];

export const catalogOrder = (key: string) =>
  catalogIndex.get(key) ?? Number.MAX_SAFE_INTEGER;

export const isCatalogKey = (key: string) => catalogIndex.has(key);

/**
 * Built-in matrix used until a tenant overrides a cell. Managers get every
 * assignable action, employees read-only access to business domains, and the
 * tenant administration domain stays closed to employees.
 */
export function defaultActions(
  key: string,
  role: PermissionRole,
): PermissionAction[] {
  if (role === "MANAGER")
    return key === SELF_FEATURE ? ["view"] : [...assignableActions];
  const entry = catalogEntry(key);
  if (!entry || entry.group === "tenant-system") return [];
  return ["view"];
}

export const normalizeActions = (actions: readonly string[]) =>
  assignableActions.filter((action) => actions.includes(action));
