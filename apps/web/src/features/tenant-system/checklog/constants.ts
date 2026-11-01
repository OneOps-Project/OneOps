export const definition = {
  id: "tenant-system/checklog",
  icon: 9,
  label: "Nhật ký",
  title: "Nhật ký hệ thống",
  singular: "sự kiện nhật ký",
  dateLabel: "Thời điểm",
  personLabel: "Người thực hiện",
  tabs: [],
  sections: [],
  statuses: ["Thành công", "Thất bại", "Bị từ chối"],
  fields: [],
  navigation: {
    title: "Nhật ký hệ thống",
    collapsed: true,
    defaultSection: "Tất cả sự kiện",
    allSection: "Tất cả sự kiện",
    items: [
      { label: "Tất cả sự kiện", href: "/tenant-system/checklog" },
      { label: "Thất bại", href: "/tenant-system/checklog?result=FAILURE" },
      { label: "Bị từ chối", href: "/tenant-system/checklog?result=DENIED" },
    ],
  },
} as const;
export const resultLabels = {
  SUCCESS: "Thành công",
  FAILURE: "Thất bại",
  DENIED: "Bị từ chối",
} as const;
const moduleLabels: Record<string, string> = {
  "tenant-system/access-control/accounts": "Tài khoản",
  "tenant-system/access-control/tenant-auth": "Xác thực",
  "tenant-system/access-control/roles-permissions": "Phân quyền",
  "tenant-system/checklog": "Nhật ký",
  "hr-management/employees/employee-directory": "Hồ sơ nhân viên",
  "hr-management/employees/resource-capacity": "Công suất làm việc",
  "hr-management/organization/departments-teams": "Phòng ban",
  "hr-management/organization/positions-grades": "Chức danh và cấp bậc",
  "work-management/work/tasks": "Công việc",
  "work-management/projects/project-spaces": "Dự án",
};
const actionLabels: Record<string, string> = {
  "account.created": "Tạo tài khoản",
  "account.updated": "Sửa tài khoản",
  "account.status-changed": "Khóa/mở khóa tài khoản",
  "account.role-changed": "Thay đổi vai trò",
  "account.password-reset": "Đặt lại mật khẩu",
  "account.administration-changed": "Thay đổi quyền quản trị",
  "account.bootstrapped": "Khởi tạo quản trị cấp cao",
  "account-group.created": "Tạo nhóm tài khoản",
  "account-group.updated": "Sửa nhóm tài khoản",
  "employee.created": "Tạo hồ sơ nhân viên",
  "employee.updated": "Sửa hồ sơ nhân viên",
  "department.created": "Tạo phòng ban",
  "department.updated": "Sửa phòng ban",
};
const entityLabels: Record<string, string> = {
  account: "Tài khoản",
  "account-group": "Nhóm tài khoản",
  employee: "Nhân viên",
  department: "Phòng ban",
  team: "Team",
  task: "Công việc",
  project: "Dự án",
};
export const moduleLabel = (value: string) => moduleLabels[value] || value;
export const actionLabel = (value: string) => actionLabels[value] || value;
export const entityLabel = (value: string) => entityLabels[value] || value;
export const formatTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
export const fieldLabels: Record<string, string> = {
  username: "Tên đăng nhập",
  email: "Email",
  role: "Vai trò",
  status: "Trạng thái",
  name: "Tên",
  displayName: "Họ tên",
  description: "Mô tả",
  reason: "Lý do",
  affectedTasks: "Công việc cần giao lại",
  passwordChanged: "Đã đặt lại mật khẩu",
  manageAccounts: "Quyền quản trị tài khoản",
  ownerName: "Người sở hữu",
  memberNames: "Thành viên",
  memberIds: "ID thành viên",
  employeeId: "ID nhân viên",
  version: "Phiên bản",
  directory: "Directory",
  ownerId: "ID người sở hữu",
  phone: "Số điện thoại",
  address: "Địa chỉ",
  salary: "Lương",
};
