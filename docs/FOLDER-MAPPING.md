# Phân bổ theo “Cau Truc Thu Muc (1).md”

File gốc tại root là chuẩn đặt tên, kết hợp các nhánh được bổ sung và hoàn thiện qua các mốc phát triển. Có đúng **4 nhóm chính, 39 thư mục chức năng con đối xứng FE/BE**: `tenant-system` (9), `work-management` (12), `hr-management` (11), `crm` (7).

---

## 1. Danh mục 29 chức năng dữ liệu đã triển khai đầy đủ

Hiện hệ thống sở hữu **29 chức năng dữ liệu hoàn chỉnh** (gồm 9 Record APIs và 20 Resource APIs), phân bổ trên **46 models Prisma**:

| Phân hệ (Domain)  | Đường dẫn Feature                       | Phạm vi triển khai thực tế                                                                 | Model Prisma sở hữu                                        |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `tenant-system`   | `access-control/tenant-auth`            | Xác thực phiên trượt (sliding window), thiết lập First Admin, cookie phiên, `SessionGuard` | `TenantSession`                                            |
| `tenant-system`   | `access-control/accounts`               | Quản trị vòng đời tài khoản, đổi mật khẩu, kích hoạt/tạm khóa                              | `TenantAccount`                                            |
| `tenant-system`   | `access-control/roles-permissions`      | Vai trò (Role), gán quyền (RoleBinding), catalog quyền hạt nhân, `PermissionGuard`         | `TenantRole`, `TenantRoleBinding`                          |
| `tenant-system`   | `checklog`                              | Nhật ký kiểm toán bất biến (append-only), lưu vết truy vết dữ liệu                         | `AuditChecklog`                                            |
| `tenant-system`   | `organization/work-policies`            | Quy chuẩn giờ làm ngày/tuần, giờ lõi, whitelist IP, ngày lễ, định mức phép năm             | `WorkPolicy`, `WorkHoliday`, `OfficeNetwork`, `LeaveQuota` |
| `hr-management`   | `organization/departments-teams`        | Sơ đồ phòng ban hình cây không chu trình (BR-ORG-10), bổ nhiệm Trưởng phòng                | `HrDepartment`                                             |
| `hr-management`   | `organization/positions-grades`         | Danh mục vị trí công việc, ngạch bậc chuyên môn                                            | `HrPosition`                                               |
| `hr-management`   | `employees/employee-directory`          | Hồ sơ, danh bạ nhân sự, liên kết tài khoản hệ thống                                        | `HrEmployee`                                               |
| `hr-management`   | `employees/resource-capacity`           | Quản lý quỹ giờ khả dụng và phân bổ công suất dự án                                        | `CapacityPeriod`, `ProjectAllocation`                      |
| `hr-management`   | `attendance/daily-checkin`              | Điểm danh bấm giờ vào/ra thực tế, IP, tính thời lượng, phát hiện vi phạm                   | `AttendanceRecord`                                         |
| `hr-management`   | `attendance/workforce-board`            | Bảng theo dõi quân số hiện diện tức thời theo phòng ban                                    | `WorkforcePresence`                                        |
| `hr-management`   | `attendance/checkin-explanations`       | Đơn giải trình vi phạm điểm danh và luồng quản lý duyệt                                    | `CheckinExplanation`                                       |
| `hr-management`   | `attendance/shifts-schedules`           | Thiết lập mẫu ca kíp, mẫu tuần hoàn và phân ca nhân sự                                     | `ShiftTemplate`, `SchedulePattern`, `ScheduleAssignment`   |
| `hr-management`   | `attendance/attendance-reports`         | Báo cáo tổng hợp công kỳ hạn và chốt sổ bảng công bất biến                                 | `AttendancePeriod`, `AttendancePeriodLine`                 |
| `hr-management`   | `leaves/leave-requests`                 | Đơn xin nghỉ phép, kiểm tra hạn mức còn lại và bàn giao công việc                          | `LeaveRequest`                                             |
| `hr-management`   | `leaves/leave-approvals`                | Xét duyệt nghỉ phép đa cấp, chống tự duyệt                                                 | `LeaveDecision`                                            |
| `work-management` | `work/tasks`                            | Thực thể công việc, người phụ trách, checklist, hạn chót, liên kết dự án                   | `WorkTask`                                                 |
| `work-management` | `work/task-workflow`                    | Máy trạng thái TR-02…TR-09, phân quyền actor, đề xuất hoãn/hủy/gia hạn                     | `WorkTaskWorkflow`                                         |
| `work-management` | `work/task-comments`                    | API riêng `/task-comments`, bình luận trao đổi và log hệ thống, liên kết                   | `WorkTaskComment`                                          |
| `work-management` | `work/kanban`                           | View Kanban tương tác kéo-thả, tích hợp máy trạng thái workflow                            | _(Dùng chung WorkTask)_                                    |
| `work-management` | `coordination/notifications`            | Kênh Server-Sent Events (SSE) thời gian thực, đếm badge unread, xóa mềm                    | `NotificationRecord`                                       |
| `work-management` | `coordination/internal-chat`            | Kênh trao đổi nội bộ theo chủ đề và tin nhắn thành viên                                    | `WorkThread`, `WorkMessage`                                |
| `work-management` | `coordination/workspace-today`          | Dashboard tổng quan ngày, tiện ích cá nhân hóa                                             | `WorkspaceWidget`                                          |
| `work-management` | `coordination/workspace-today/calendar` | Lịch biểu sự kiện, cuộc họp, thời gian tập trung                                           | `WorkEvent`                                                |
| `work-management` | `coordination/workspace-today/reports`  | Báo cáo và chỉ số tổng hợp công việc                                                       | `WorkReport`                                               |
| `work-management` | `coordination/tickets-approvals`        | Phiếu yêu cầu, đề xuất nội bộ và quy trình duyệt/từ chối                                   | `WorkRequest`                                              |
| `work-management` | `coordination/knowledge-sop`            | Soạn thảo, lưu trữ quy trình vận hành chuẩn (SOP), ghi chú nghiệp vụ                       | `WorkNote`                                                 |
| `work-management` | `projects/project-spaces`               | Không gian quản trị dự án, tiến độ hoàn thành, thành viên                                  | `WorkProject`                                              |
| `work-management` | `projects/milestones-qa`                | Mốc bàn giao dự án, cổng kiểm định chất lượng (QA Gate)                                    | `WorkMilestone`, `WorkQaGate`                              |
| `work-management` | `projects/timesheets`                   | Chấm công thời gian thực bước 15 phút, duyệt bảng công                                     | `WorkTimesheet`                                            |

---

## 2. Phần chưa triển khai được để trống theo quy chuẩn

- **tenant-system:** `company-profile` (hồ sơ doanh nghiệp), `automation-hub` (`external-integrations`, `workflow-rules`, `ai-copilot`).
- **crm:** Toàn bộ 7 nhánh con (`presales/*`, `commercial/*`, `customer-success/*`).
- **Hạ tầng core:** Thư mục cấu trúc chuẩn được giữ sạch sẽ, không tạo controller, service, page rỗng hay mock endpoint giả mạo.

---

## 3. Database chung, model độc lập

- Package `@oneops/database` sở hữu cấu hình Prisma, generated client, public exports và lịch sử migration.
- `prisma/schema/base.prisma` chỉ chứa datasource PostgreSQL, generator và danh sách các multi-schema namespaces.
- `prisma/schema/features` là directory junction kết nối tới `apps/api/src/features` để Prisma đọc trực tiếp các model gốc tại thư mục `prisma/` của từng feature.
- Hệ thống hiện nạp **46 models Prisma** phân tán trong các feature mà không xảy ra trùng lặp schema.

---

## 4. Định tuyến ứng dụng (App Router - 26 Modules)

Các trang được tổ chức trực tiếp dưới `apps/web/src/app/`:

- **Quản lý công việc:** `/` (Trang chủ), `/work-management/tasks`, `/work-management/kanban`, `/work-management/projects`, `/work-management/milestones`, `/work-management/timesheets`, `/work-management/calendar`, `/work-management/tickets-approvals`, `/work-management/internal-chat`, `/work-management/knowledge-sop`, `/work-management/reports`, `/work-management/notifications`.
- **Quản lý nhân sự:** `/hr-management/organization`, `/hr-management/positions`, `/hr-management/employees`, `/hr-management/attendance`, `/hr-management/workforce`, `/hr-management/explanations`, `/hr-management/shifts`, `/hr-management/attendance-reports`, `/hr-management/leaves`, `/hr-management/leave-approvals`, `/hr-management/capacity`.
- **Quản trị hệ thống:** `/tenant-system/auth`, `/tenant-system/accounts`, `/tenant-system/roles-permissions`, `/tenant-system/work-policies`, `/tenant-system/checklog`.
- **Hệ thống thiết kế:** `/design-system`, `/design-tokens`.
