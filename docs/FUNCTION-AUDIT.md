# Rà soát chức năng và quyền sở hữu module

Đánh giá từ mã nguồn thực tế, không suy ra mức hoàn thiện từ tên thư mục. Báo cáo được đối chiếu lại toàn bộ 39 nhánh ngày 31/10/2026 sau khi hoàn thiện toàn diện các phân hệ:

- **Tenant Access Control, Audit, Work Policies & Automation** (`tenant-system`: 6/9 chức năng).
- **HR Management toàn diện 100%** (`hr-management`: 11/11 chức năng hoàn thiện).
- **Work Management hoàn thiện 100%** (`work-management`: 12/12 chức năng hoàn thiện).

---

## 1. Mức độ triển khai chi tiết trên 39 nhánh

| Chức năng                                            |    FE     |    BE     | Hiện trạng & Đánh giá nghiệp vụ                                                                                             |
| ---------------------------------------------------- | :-------: | :-------: | --------------------------------------------------------------------------------------------------------------------------- |
| `tenant-system/organization/company-profile`         |   Trống   |   Trống   | Thư mục cấu trúc chuẩn; dành cho hồ sơ pháp nhân doanh nghiệp khi mở rộng.                                                  |
| `tenant-system/organization/work-policies`           | **Có mã** | **Có mã** | Quy chuẩn giờ làm việc ngày/tuần, giờ lõi, whitelist IP văn phòng, ngày lễ và quỹ ngày nghỉ phép năm.                       |
| `tenant-system/access-control/tenant-auth`           | **Có mã** | **Có mã** | Xác thực phiên đăng nhập trượt (sliding session), thiết lập First Admin an toàn, cookie phiên & `SessionGuard`.             |
| `tenant-system/access-control/roles-permissions`     | **Có mã** | **Có mã** | Quản lý vai trò (Role), gán quyền (RoleBinding), bộ catalog quyền hạt nhân và `PermissionGuard`.                            |
| `tenant-system/access-control/accounts`              | **Có mã** | **Có mã** | Vòng đời tài khoản người dùng, đổi mật khẩu, kích hoạt/tạm khóa tài khoản.                                                  |
| `tenant-system/automation-hub/external-integrations` |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |
| `tenant-system/automation-hub/workflow-rules`        | **Có mã** | **Có mã** | Quy tắc tự động theo sự kiện công việc: điều kiện AND, hành động giao việc/chuyển trạng thái/bình luận/thông báo, chạy thử, nhật ký lượt chạy và khóa chống vòng lặp. |
| `tenant-system/automation-hub/ai-copilot`            |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |
| `tenant-system/checklog`                             | **Có mã** | **Có mã** | Nhật ký kiểm toán bất biến (append-only), lưu vết truy vết thao tác và dữ liệu trước/sau thay đổi.                          |
| `hr-management/organization/departments-teams`       | **Có mã** | **Có mã** | Sơ đồ phòng ban hình cây không chu trình (BR-ORG-10), phân bổ Trưởng phòng/Trưởng nhóm quản lý.                             |
| `hr-management/organization/positions-grades`        | **Có mã** | **Có mã** | Danh mục vị trí công việc, chức danh nghề nghiệp và ngạch bậc chuyên môn.                                                   |
| `hr-management/employees/employee-directory`         | **Có mã** | **Có mã** | Danh bạ nhân sự toàn công ty, thông tin nhân viên, chức vụ, phòng ban và liên kết tài khoản hệ thống.                       |
| `hr-management/employees/resource-capacity`          | **Có mã** | **Có mã** | Quản lý quỹ giờ khả dụng theo tháng (`CapacityPeriod`) và phân bổ giờ làm vào các dự án (`ProjectAllocation`).              |
| `hr-management/attendance/daily-checkin`             | **Có mã** | **Có mã** | Ghi nhận giờ vào/ra thực tế, IP, tính toán thời lượng làm việc, phát hiện vi phạm đi muộn, về sớm.                          |
| `hr-management/attendance/workforce-board`           | **Có mã** | **Có mã** | Bảng theo dõi quân số hiện diện tức thời (có mặt, làm từ xa, nghỉ phép, đi muộn) theo phòng ban.                            |
| `hr-management/attendance/checkin-explanations`      | **Có mã** | **Có mã** | Đơn giải trình lý do vi phạm điểm danh (giao thông, lỗi hệ thống, gặp khách hàng...), quy trình duyệt của quản lý.          |
| `hr-management/attendance/shifts-schedules`          | **Có mã** | **Có mã** | Quản lý mẫu ca kíp (`ShiftTemplate`), mẫu tuần hoàn (`SchedulePattern`) và phân ca cho nhân sự (`ScheduleAssignment`).      |
| `hr-management/attendance/attendance-reports`        | **Có mã** | **Có mã** | Bảng tổng hợp công kỳ hạn (`AttendancePeriod`) và chi tiết nhân viên (`AttendancePeriodLine`), chốt công bất biến (CLOSED). |
| `hr-management/leaves/leave-requests`                | **Có mã** | **Có mã** | Đơn xin nghỉ phép (nghỉ năm, ốm, thai sản, không lương), kiểm tra hạn mức còn lại và chỉ định người nhận bàn giao.          |
| `hr-management/leaves/leave-approvals`               | **Có mã** | **Có mã** | Luồng xét duyệt nghỉ phép, chống tự duyệt và lưu vết quyết định (`LeaveDecision`).                                          |
| `work-management/work/tasks`                         | **Có mã** | **Có mã** | CRUD công việc, checklist, người phụ trách, liên kết dự án; trạng thái chuyển tiếp qua workflow.                            |
| `work-management/work/task-workflow`                 | **Có mã** | **Có mã** | Máy trạng thái TR-02…TR-09, phân quyền thao tác theo actor, đề xuất hoãn/hủy/gia hạn chờ Quản lý duyệt.                     |
| `work-management/work/task-comments`                 | **Có mã** | **Có mã** | API riêng `/task-comments`; bình luận người dùng và bình luận hệ thống (SYSTEM log), đính kèm liên kết.                     |
| `work-management/work/kanban`                        | **Có mã** | _View FE_ | Giao diện Kanban trực quan kéo thả thẻ công việc, tích hợp trực tiếp với máy trạng thái task-workflow.                      |
| `work-management/coordination/notifications`         | **Có mã** | **Có mã** | Kênh Server-Sent Events (SSE) thời gian thực, đếm badge unread, cơ chế xóa mềm (Soft Delete `deletedAt`).                   |
| `work-management/coordination/internal-chat`         | **Có mã** | **Có mã** | Kênh trao đổi nội bộ theo chủ đề và tin nhắn thành viên trong không gian làm việc.                                          |
| `work-management/coordination/workspace-today`       | **Có mã** | **Có mã** | Dashboard tổng quan ngày, tích hợp tiện ích làm việc, sự kiện lịch (`calendar`) và chỉ số báo cáo (`reports`).              |
| `work-management/coordination/tickets-approvals`     | **Có mã** | **Có mã** | Tạo phiếu đề xuất nội bộ và quy trình xét duyệt/từ chối kèm lý do phản hồi.                                                 |
| `work-management/coordination/knowledge-sop`         | **Có mã** | **Có mã** | Soạn thảo, lưu trữ và tra cứu quy trình vận hành tiêu chuẩn (SOP), ghi chú nghiệp vụ.                                       |
| `work-management/projects/project-spaces`            | **Có mã** | **Có mã** | Quản lý không gian dự án, phân loại danh mục, theo dõi tỷ lệ % hoàn thành và thành viên.                                    |
| `work-management/projects/milestones-qa`             | **Có mã** | **Có mã** | Mốc tiến độ dự án, cổng kiểm định chất lượng (QA Gate) bắt buộc ký duyệt trước khi đóng mốc/hoàn tất việc.                  |
| `work-management/projects/timesheets`                | **Có mã** | **Có mã** | Bảng chấm công tuần, ghi nhận giờ làm bước 15 phút, cơ chế duyệt bảng công của quản lý.                                     |
| `crm/presales/leads-customers`                       |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |
| `crm/presales/discovery-briefs`                      |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |
| `crm/commercial/quotations-sow`                      |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |
| `crm/commercial/contracts`                           |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |
| `crm/customer-success/receivables`                   |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |
| `crm/customer-success/customer-portal`               |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |
| `crm/customer-success/after-sales`                   |   Trống   |   Trống   | Chưa triển khai, được để trống theo yêu cầu kiến trúc.                                                                      |

---

## 2. Thống kê tổng hợp

- **Tổng số nhánh đăng ký theo cấu trúc:** 39 nhánh đối xứng FE/BE.
- **Số chức năng dữ liệu hoàn chỉnh:** **29 chức năng** (gồm 9 Record APIs và 20 Resource APIs đã được kiểm định đầy đủ).
- **Số model Prisma thuộc quyền sở hữu:** **46 models** phân tán trong các thư mục `prisma/` của từng chức năng.
- **Mã nguồn hợp lệ:** **698 source files** có thể truy vết đầy đủ từ application entrypoints (`npm run unused:check` đạt 100%).
- **Sơ đồ tri thức Graphify:** 4.978 nodes, 13.126 edges, 169 communities; sơ đồ luồng Mermaid tương tác tại `graphify-out/OneOps-callflow.html`.

---

## 3. Ranh giới sở hữu nghiệp vụ đã được chuẩn hóa

| Cặp phân hệ                                                | Ranh giới sở hữu chuẩn                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **accounts / tenant-auth / roles-permissions**             | `accounts` quản lý vòng đời tài khoản người dùng; `tenant-auth` xác thực phiên/cookie và actor context; `roles-permissions` quản lý chính sách vai trò và quyền truy cập.            |
| **work-policies / shifts-schedules**                       | `work-policies` quy định chuẩn thời gian toàn công ty (480m/ngày, 2400m/tuần, IP văn phòng, ngày nghỉ lễ); `shifts-schedules` lập ca kíp và lịch làm việc cụ thể của từng nhân viên. |
| **daily-checkin / checkin-explanations / workforce-board** | `daily-checkin` ghi nhận bấm giờ thực tế; `checkin-explanations` xử lý giải trình vi phạm; `workforce-board` cung cấp báo cáo tổng hợp hiện diện tức thời.                           |
| **leave-requests / leave-approvals / resource-capacity**   | Đơn nghỉ phép thẩm định hạn mức, người duyệt độc lập ký duyệt, thời gian nghỉ được cập nhật trực tiếp vào bảng công suất định biên nhân sự (`resource-capacity`).                    |
| **attendance-reports / timesheets**                        | `attendance-reports` tổng hợp ngày công và chốt bảng lương hành chính của nhân sự; `timesheets` ghi nhận chi tiết thời gian làm việc (bước 15 phút) vào từng đầu việc/dự án.         |
| **tasks / task-workflow / kanban**                         | Task sở hữu thực thể dữ liệu; workflow thực thi quy tắc chuyển trạng thái hữu hạn; Kanban cung cấp giao diện trực quan thao tác kéo thả.                                             |

---

## 4. Các khoảng trống thiết kế dành cho giai đoạn tiếp theo

1. **Tenant System:** Hồ sơ pháp nhân doanh nghiệp (`company-profile`), và trung tâm tích hợp ngoài (`automation-hub`: external-integrations, ai-copilot).
2. **CRM:** Toàn bộ 7 nhánh thương mại và quan hệ khách hàng (tiền bán hàng, hợp đồng, chăm sóc khách hàng).
