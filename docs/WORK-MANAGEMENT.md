# Phân hệ Quản lý & Điều phối Công việc (Work Management)

---

## 1. Nguồn tham khảo & Định hướng kiến trúc

- [Base XSpace](https://base.vn/app/xspace): Không gian làm việc số, dashboard tổng quan ngày làm việc, giao tiếp nội bộ và quản trị lịch sự kiện.
- [Base WeWork](https://base.vn/app/wework): Không gian dự án, phân bổ công việc, bảng Kanban và theo dõi tiến độ đa chiều.
- [XCalendar My time](https://help.base.vn/support/solutions/articles/63000284083--xspace-xcalendar-b%E1%BA%ADt-ch%E1%BA%BF-%C4%91%E1%BB%99-my-time-%C4%91%E1%BB%83-theo-d%C3%B5i-l%E1%BB%8Bch-bi%E1%BB%83u-c%C3%B4ng-vi%E1%BB%87c): Lịch sự kiện và phân bổ thời gian làm việc tập trung.

Phân hệ Work Management của OneOps là nền tảng quản lý công việc và điều hành nội bộ doanh nghiệp, sở hữu dữ liệu thật trên PostgreSQL và đồng bộ với hệ thống Design System 187 tokens.

---

## 2. Các thành phần nghiệp vụ đã triển khai hoàn chỉnh

1. **Tổng quan làm việc hôm nay (`workspace-today`):**
   - Bảng điều khiển cá nhân hóa, thống kê việc cần làm, việc đang làm, việc trễ hạn và các sự kiện trong ngày.
   - Tích hợp Lịch sự kiện (`calendar`) và Báo cáo chỉ số (`reports`).
2. **Quản lý công việc & Bảng Kanban (`tasks` & `kanban`):**
   - Quản lý công việc, checklist con, người phụ trách, độ ưu tiên, hạn chót và dự án liên kết.
   - Bảng Kanban trực quan hỗ trợ kéo thả thẻ task giữa các cột trạng thái.
3. **Máy trạng thái công việc (`task-workflow`):**
   - Chuyển trạng thái tuân thủ nghiêm ngặt quy tắc máy trạng thái TR-02…TR-09: `Draft` $\rightarrow$ `Open` $\rightarrow$ `In Progress` $\rightarrow$ `Review` $\rightarrow$ `Completed` (kèm `Blocked` và `Cancelled`).
   - Tạo mới hoặc cập nhật thông thường không được phép sửa trực tiếp trường `status`.
   - Mỗi lần chuyển trạng thái tự động lưu lịch sử, lý do và sinh một bản ghi bình luận `SYSTEM`.
   - Cơ chế đề xuất: Người thực hiện có thể gửi đề xuất `HOLD`, `CANCEL` hoặc `DEADLINE`; Quản lý độc lập (khác người đề xuất) sẽ ra quyết định duyệt hoặc từ chối.
4. **Luồng bình luận công việc (`task-comments`):**
   - API riêng biệt `/api/v1/work/tasks/:taskId/comments` (tách độc lập khỏi model Task).
   - Hỗ trợ phân loại bình luận `COMMENT` (người dùng) và `SYSTEM` (ghi nhận thay đổi tiến độ/lý do workflow), hỗ trợ @nhắc tên và đính kèm liên kết.
5. **Không gian dự án (`project-spaces`):**
   - Quản lý dự án, danh mục phân loại, mục tiêu, giám sát tiến độ và danh sách công việc liên thuộc.
6. **Mốc tiến độ & Cổng kiểm định chất lượng (`milestones-qa`):**
   - Quản lý mốc bàn giao dự án gắn liền với các công việc cần hoàn thành.
   - Cổng QA Gate: Thiết lập các tiêu chí chấp nhận bắt buộc; hệ thống tự động chặn chuyển trạng thái sang hoàn thành (TR-04) nếu QA chưa xác nhận đạt chuẩn (Quản lý chỉ được phép override khi có lý do chính đáng được lưu vết).
7. **Chấm công thời gian thực (`timesheets`):**
   - Bảng chấm công tuần bắt đầu vào thứ Hai, ghi nhận thời gian theo bước 15 phút.
   - Ngưỡng giới hạn: Ngày tối đa 480 phút (8 giờ), tuần tối đa 2400 phút (40 giờ).
   - Cơ chế phê duyệt: Quản lý không tự duyệt bảng công của chính mình; điều chỉnh số giờ chỉ được thực hiện sau khi có phê duyệt.
8. **Đề xuất & Phê duyệt (`tickets-approvals`):**
   - Tạo phiếu yêu cầu nội bộ (xin nghỉ, tạm ứng, mua sắm...) và luồng xử lý Duyệt / Từ chối kèm lý do.
9. **Trao đổi nội bộ (`internal-chat`) & Kho tri thức (`knowledge-sop`):**
   - Kênh trao đổi trực tiếp theo luồng chủ đề công việc.
   - Kho lưu trữ quy trình vận hành tiêu chuẩn (SOP) và tài liệu hướng dẫn nghiệp vụ.
10. **Trung tâm thông báo thời gian thực (`notifications`):**
    - Kênh sự kiện Server-Sent Events (SSE) tại `/api/v1/work/notifications/stream` đẩy thông báo tức thì khi có việc mới được giao, cập nhật trạng thái, tin nhắn hoặc lịch họp.
    - Cơ chế **Xóa mềm (Soft Delete `deletedAt`)**: Thao tác xóa trên giao diện sẽ ẩn thông báo khỏi người dùng và cập nhật lại bộ đếm unread badge, trong khi bản ghi trong database vẫn được lưu trọn vẹn để bảo toàn kiểm toán.
11. **Liên kết công việc & cổng chặn khởi động (`task-links`):**
    - Liên kết có kiểu (chặn, liên quan, trùng lặp, phụ thuộc) giữa hai công việc; hệ thống tự phát hiện chu trình và chống trùng cặp liên kết.
    - Công việc còn liên kết chặn đang mở thì không thể bắt đầu; Quản lý chỉ được vượt cổng khi nhập lý do và lý do được lưu vào lịch sử workflow.
12. **Phê duyệt theo thứ tự & cam kết SLA (`tickets-approvals`):**
    - Phiếu yêu cầu chạy theo chuỗi bước duyệt có thứ tự, gom nhóm song song, ngưỡng số người đồng ý (quorum) và trả về người đề xuất khi bị từ chối.
    - Đồng hồ SLA theo từng bước, tự động leo thang cho cấp trên khi quá hạn; hộp thư “bước chờ tôi duyệt” gom toàn bộ việc cần quyết định.
13. **Sprint & Backlog (`project-spaces`):**
    - Xếp hạng backlog bằng rank thưa, ước lượng story point, cam kết sprint so với năng lực (cảnh báo vượt và cần Quản lý xác nhận).
    - Chỉ một sprint hoạt động tại một thời điểm; đóng sprint chuyển việc dở dang sang sprint kế tiếp và ghi nhận vận tốc.
14. **Quy tắc tự động (`tenant-system/automation-hub/workflow-rules`):**
    - Quy tắc theo sự kiện công việc với điều kiện AND và hành động giao việc/chuyển trạng thái/bình luận/thông báo; có chạy thử trên dữ liệu giả lập và nhật ký từng lượt chạy.
    - Tự động hóa không vượt qua máy trạng thái: chỉ đi trên cạnh hợp lệ TR-02…TR-09 và tôn trọng cổng deadline.

---

## 3. Quản trị dữ liệu & Ranh giới

- Tất cả các chức năng thuộc Work Management lưu trữ dữ liệu tại các schema PostgreSQL độc lập với tiền tố `work_*` (ví dụ: `work_tasks`, `work_task_links`, `work_task_workflow`, `work_task_comments`, `work_milestones_qa`, `work_timesheets`, `work_calendar`, `work_requests`, `work_messages`, `work_notes`, `work_reports`, `work_notifications`, `work_dashboard`, `work_projects`).
- Liên kết giữa các thực thể (Task $\leftrightarrow$ Project $\leftrightarrow$ Assignee $\leftrightarrow$ Milestone) sử dụng định danh scalar ID, không tạo foreign key xuyên namespace để đảm bảo tính độc lập module.
- Tích hợp xuyên suốt giữa Task, Workflow, QA Gate và Comments được điều phối tập trung thông qua `work-management.composition.ts`.
- Tự động hóa nối với Work Management qua bus hạ tầng `core/events/workflow-events.ts`: nơi sở hữu dữ liệu công bố snapshot, quy tắc nằm ở `tenant-system/automation-hub/workflow-rules`, và bộ áp dụng hành động nằm ở `work-management/automation.actions.ts`.
