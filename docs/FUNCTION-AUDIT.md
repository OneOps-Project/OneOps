# Rà soát chức năng và quyền sở hữu module

Đánh giá từ mã nguồn thực tế, không suy ra mức hoàn thiện từ tên thư mục. Báo cáo đã cập nhật sau khi triển khai Accounts và các phần phụ thuộc tối thiểu theo BA ngày 30/10/2026.

## Mức độ triển khai

| Chức năng                                          | FE                          | BE                          | Nhận xét                                                                                                   |
| -------------------------------------------------- | --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| tenant-system/organization/company-profile         | Trống                       | Trống                       | Code đội nhóm đã gỡ; dành cho hồ sơ doanh nghiệp.                                                          |
| tenant-system/organization/work-policies           | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| tenant-system/access-control/tenant-auth           | Trống                       | Có mã tối thiểu             | Xác thực và phiên cho toàn ứng dụng; UI đăng nhập được ghép từ Accounts.                                   |
| tenant-system/access-control/roles-permissions     | Trống                       | Có mã tối thiểu             | Hai role cố định và quyền quản trị tài khoản; chưa có RBAC đầy đủ cho module khác.                         |
| tenant-system/access-control/accounts              | Có mã                       | Có mã                       | Quản lý tài khoản/Group, liên kết nhân sự, phiên và lịch sử theo BA.                                       |
| tenant-system/automation-hub/external-integrations | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| tenant-system/automation-hub/workflow-rules        | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| tenant-system/automation-hub/ai-copilot            | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| tenant-system/checklog                             | Có mã                       | Có mã                       | Ghi nhận, tra cứu tập trung, chi tiết, che dữ liệu nhạy cảm; quyền đọc riêng và không có endpoint sửa/xóa. |
| work-management/work/tasks                         | Có mã, chưa kết luận đầy đủ | Có mã, chưa kết luận đầy đủ | CRUD, 4 trạng thái, checklist; người thực hiện/dự án dạng chuỗi, chưa có quy trình chuyên biệt.            |
| work-management/work/task-workflow                 | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| work-management/work/task-comments                 | Có mã, chưa kết luận đầy đủ | Trống                       | Component FE; comments lưu trong JSON của Tasks, chưa có API độc lập.                                      |
| work-management/work/kanban                        | Có mã, chưa kết luận đầy đủ | Trống                       | View nhận dữ liệu/callback từ Tasks; không có dữ liệu task thứ hai.                                        |
| work-management/coordination/notifications         | Trống                       | Có mã tối thiểu             | Thông báo bàn giao task khi khóa tài khoản; UI được ghép tại Accounts.                                     |
| work-management/coordination/internal-chat         | Có mã, chưa kết luận đầy đủ | Có mã, chưa kết luận đầy đủ | Chủ đề và bình luận lưu qua API; chưa có chat realtime/identity.                                           |
| work-management/coordination/workspace-today       | Có mã, chưa kết luận đầy đủ | Có mã, chưa kết luận đầy đủ | Dashboard và tiện ích; có thêm calendar/reports để giữ chức năng cũ.                                       |
| work-management/coordination/tickets-approvals     | Có mã, chưa kết luận đầy đủ | Có mã, chưa kết luận đầy đủ | CRUD và đổi status; chưa có quy trình phê duyệt được phân quyền; category Nghỉ phép sai phạm vi.           |
| work-management/coordination/knowledge-sop         | Có mã, chưa kết luận đầy đủ | Có mã, chưa kết luận đầy đủ | Ghi chú/tri thức cơ bản; chưa có SOP có phiên bản/phê duyệt.                                               |
| work-management/projects/project-spaces            | Có mã, chưa kết luận đầy đủ | Có mã, chưa kết luận đầy đủ | CRUD dự án, thành viên và tiến độ nhập tay; chưa có liên kết task/nhân sự.                                 |
| work-management/projects/milestones-qa             | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| work-management/projects/timesheets                | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/attendance/daily-checkin             | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/attendance/workforce-board           | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/attendance/checkin-explanations      | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/attendance/shifts-schedules          | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/attendance/attendance-reports        | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/leaves/leave-requests                | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/leaves/leave-approvals               | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/employees/employee-directory         | Trống                       | Có mã tối thiểu             | Lưu/tạo hồ sơ nhân viên thật phục vụ cấp tài khoản; chưa triển khai toàn bộ HR.                            |
| hr-management/employees/resource-capacity          | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| hr-management/organization/departments-teams       | Trống                       | Trống                       | Module quản lý phòng ban; chưa triển khai và không nhận code đội nhóm cũ.                                  |
| hr-management/organization/positions-grades        | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| crm/presales/leads-customers                       | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| crm/presales/discovery-briefs                      | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| crm/commercial/quotations-sow                      | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| crm/commercial/contracts                           | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| crm/customer-success/receivables                   | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| crm/customer-success/customer-portal               | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |
| crm/customer-success/after-sales                   | Trống                       | Trống                       | Chưa triển khai, được để trống theo yêu cầu trước đó.                                                      |

Trong 39 nhánh đăng ký: 8 có mã cả FE/BE, 2 chỉ có FE, 4 chỉ có BE tối thiểu, 25 chưa có implementation. Hai implementation calendar/reports nằm dưới workspace-today không tính thêm vào 39 nhánh.

## Phạm vi cần xử lý và nội dung đã cập nhật

- Đã xử lý company-profile theo yêu cầu 30/10/2026: xóa code đội nhóm và để trống; không chuyển code sang HR. departments-teams có nhiệm vụ quản lý phòng ban, chưa triển khai.
- tickets-approvals cho phép category Nghỉ phép trong cả types FE và DTO BE. Luồng nghỉ phép phải thuộc HR/leave-requests và leave-approvals. Work chỉ tổng hợp/truy cập qua hợp đồng công khai nếu cần; không tạo đơn nghỉ phép song song.

## Chồng phạm vi cần chốt trước khi triển khai

| Các nhánh                                  | Ranh giới đề xuất                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| work-policies / shifts-schedules           | Tenant giữ chính sách áp dụng toàn doanh nghiệp; HR giữ ca và phân lịch cho nhân viên.                                                |
| accounts / tenant-auth / roles-permissions | Accounts quản lý vòng đời tài khoản; auth xác thực/token; permissions quản lý chính sách truy cập.                                    |
| positions-grades / roles-permissions       | Chức danh/cấp bậc nhân sự khác vai trò phân quyền phần mềm. Không suy ra quyền tự động chỉ từ chức danh.                              |
| calendar / shifts-schedules                | Calendar cho họp/sự kiện/tập trung; HR cho ca và lịch lao động.                                                                       |
| task-comments / internal-chat              | Bình luận theo task khác trao đổi theo kênh/chủ đề. Không lưu lặp cùng nội dung vào hai nơi.                                          |
| workspace reports / attendance-reports     | Báo cáo tổng quan công việc khác báo cáo công. Có thể đọc số liệu công khai để tổng hợp.                                              |
| tasks / task-workflow / kanban             | Task sở hữu dữ liệu; workflow quyết định chuyển trạng thái; Kanban trình bày/thao tác qua hợp đồng. Không tạo ba vòng đời task riêng. |

## Các khoảng trống quan trọng

- Tenant: tài khoản, xác thực, phân quyền, chính sách, nhật ký, backup và tích hợp chưa có.
- Work: task-workflow, notifications, milestones-qa, timesheets trống; chức năng gắn nhãn phê duyệt/chat/SOP hiện chỉ là CRUD cơ bản.
- HR: toàn bộ 11 nhánh chưa có implementation.
- CRM: toàn bộ 7 nhánh chưa có implementation.
- Task, thành viên, dự án và đội nhóm chưa liên kết bằng ID nghiệp vụ; nhiều trường vẫn là chuỗi nhập tự do. Độc lập mã nguồn vẫn cho phép liên kết bằng public API/ID; không cần đọc chéo repository.

## Có chức năng thừa cần xóa không?

Chưa xác định được chức năng đã triển khai nào đủ bằng chứng để xóa. Các thư mục trống là phần được yêu cầu scaffold. Những phần chồng tên hiện phần lớn chưa có code nên là nguy cơ trùng trách nhiệm, chưa phải hai implementation trùng nhau. Calendar, báo cáo, Kanban và bình luận đang có luồng sử dụng thật.

Kiểm tra architecture và unused đạt; 269 file source reachable. Đây là kiểm tra import/artifact, không chứng minh việc phân bổ nghiệp vụ đúng hoặc mọi tính năng đã hoàn thiện.

Module tài khoản và các phụ thuộc tối thiểu đã triển khai theo BA bổ sung. Xem [ACCOUNTS.md](ACCOUNTS.md); các cột Có mã không đồng nghĩa toàn bộ phạm vi HR/phân quyền/thông báo đã hoàn tất.
