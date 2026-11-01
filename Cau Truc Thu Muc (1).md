# Cấu trúc thư mục hiện tại — OneOps

Cập nhật theo mã nguồn thực tế và các nhánh đã bổ sung. Có **4 module chính, 39 chức năng con đối xứng FE/BE**. `calendar` và `reports` là hai phần mở rộng được giữ trong `workspace-today`.

- `[trống]`: chỉ có thư mục cấu trúc; chưa tạo implementation, API hoặc trang giả.
- `[có mã hiện hữu]`: đã có mã được chuyển từ hệ thống công việc trước đó; không có nghĩa toàn bộ phạm vi chức năng dự kiến đã hoàn tất.
- Kanban/task-comments có component FE; BE riêng vẫn trống, dữ liệu hiện được xử lý qua Tasks.
- Cây rút gọn phần lặp trong từng chức năng; nhánh Tasks được mở chi tiết làm ví dụ thực tế. Không liệt kê nội dung dependency, cache và đầu ra biên dịch.

```text
OneOps3/
├── apps/                                                                            # Các ứng dụng chạy của hệ thống
│   ├── api/                                                                         # Backend NestJS
│   │   ├── src/                                                                     # Mã nguồn backend
│   │   │   ├── core/                                                                # Hạ tầng backend; không chứa nghiệp vụ
│   │   │   │   ├── auth/                                                            # Session guard và policy port hạ tầng
│   │   │   │   │   └── session.guard.ts
│   │   │   │   ├── config/                                                          # Cấu hình hạ tầng [trống]
│   │   │   │   ├── database/                                                        # Kết nối và vòng đời Prisma/PostgreSQL
│   │   │   │   │   └── database.module.ts
│   │   │   │   ├── decorators/                                                      # Decorator hạ tầng [trống]
│   │   │   │   ├── events/                                                          # Hạ tầng sự kiện [trống; chưa có Event Bus]
│   │   │   │   ├── filters/                                                         # Chuẩn hóa lỗi HTTP
│   │   │   │   │   └── errors.filter.ts
│   │   │   │   ├── interceptors/                                                    # Interceptor hạ tầng [trống]
│   │   │   │   ├── pipes/                                                           # Kiểm tra và biến đổi đầu vào
│   │   │   │   │   └── validation.pipe.ts
│   │   │   │   ├── realtime/                                                        # WebSocket/SSE [trống]
│   │   │   │   ├── types/                                                           # Kiểu hạ tầng backend [trống]
│   │   │   │   └── core.module.ts
│   │   │   ├── features/                                                            # 4 module chính và các chức năng con
│   │   │   │   ├── crm/                                                             # Khách hàng, bán hàng và hậu mãi; chưa có nghiệp vụ
│   │   │   │   │   ├── commercial/                                                  # Báo giá, phạm vi công việc và hợp đồng
│   │   │   │   │   │   ├── contracts/                                               # Hợp đồng và vòng đời thực hiện [trống]
│   │   │   │   │   │   └── quotations-sow/                                          # Báo giá và phạm vi công việc (SOW) [trống]
│   │   │   │   │   ├── customer-success/                                            # Công nợ, cổng khách hàng và chăm sóc sau bán
│   │   │   │   │   │   ├── after-sales/                                             # Chăm sóc và hỗ trợ sau bán [trống]
│   │   │   │   │   │   ├── customer-portal/                                         # Cổng làm việc dành cho khách hàng [trống]
│   │   │   │   │   │   └── receivables/                                             # Công nợ và theo dõi khoản phải thu [trống]
│   │   │   │   │   ├── presales/                                                    # Tiếp nhận và tìm hiểu khách hàng tiềm năng
│   │   │   │   │   │   ├── discovery-briefs/                                        # Khảo sát nhu cầu và tóm tắt yêu cầu khách hàng [trống]
│   │   │   │   │   │   └── leads-customers/                                         # Khách hàng tiềm năng và hồ sơ khách hàng [trống]
│   │   │   │   │   ├── crm.module.ts                                                # Ghép các chức năng đã có; không tạo endpoint giả
│   │   │   │   │   └── index.ts                                                     # Public exports cho composition
│   │   │   │   ├── hr-management/                                                   # Tổ chức nhân sự; đã có hồ sơ tối thiểu phục vụ tài khoản
│   │   │   │   │   ├── attendance/                                                  # Ca làm, điểm danh, quân số và báo cáo công
│   │   │   │   │   │   ├── attendance-reports/                                      # Tổng hợp công và báo cáo chấm công [trống]
│   │   │   │   │   │   ├── checkin-explanations/                                    # Gửi và duyệt giải trình điểm danh [trống]
│   │   │   │   │   │   ├── daily-checkin/                                           # Check-in/out, trạng thái và kiểm tra IP [trống]
│   │   │   │   │   │   ├── shifts-schedules/                                        # Ca làm và lịch làm việc của nhân viên [trống]
│   │   │   │   │   │   └── workforce-board/                                         # Theo dõi quân số và trạng thái nhân sự [trống]
│   │   │   │   │   ├── employees/                                                   # Hồ sơ nhân viên và công suất làm việc
│   │   │   │   │   │   ├── employee-directory/                                      # Hồ sơ, danh bạ và bố trí nhân sự [có mã hiện hữu]
│   │   │   │   │   │   └── resource-capacity/                                       # Công suất và khả năng nhận việc của nhân sự [trống]
│   │   │   │   │   ├── leaves/                                                      # Đơn nghỉ phép và xét duyệt
│   │   │   │   │   │   ├── leave-approvals/                                         # Xét duyệt đơn nghỉ và kết quả xử lý [trống]
│   │   │   │   │   │   └── leave-requests/                                          # Đơn nghỉ phép, nghỉ ốm và làm việc từ xa [trống]
│   │   │   │   │   ├── organization/                                                # Cơ cấu phòng ban và chức danh
│   │   │   │   │   │   ├── departments-teams/                                       # Quản lý phòng ban [trống]
│   │   │   │   │   │   └── positions-grades/                                        # Chức danh, chức vụ và cấp bậc nhân sự [trống]
│   │   │   │   │   ├── hr-management.module.ts                                      # Ghép các chức năng đã có; không tạo endpoint giả
│   │   │   │   │   └── index.ts                                                     # Public exports cho composition
│   │   │   │   ├── tenant-system/                                                   # Quản trị doanh nghiệp, tài khoản và tích hợp
│   │   │   │   │   ├── access-control/                                              # Danh tính đăng nhập, quyền và quản trị truy cập
│   │   │   │   │   │   ├── accounts/                                                # Tài khoản và phiên đăng nhập [có mã hiện hữu]
│   │   │   │   │   │   ├── roles-permissions/                                       # Vai trò, quyền và phạm vi dữ liệu [có mã hiện hữu]
│   │   │   │   │   │   └── tenant-auth/                                             # Đăng nhập và xác thực trong doanh nghiệp [có mã hiện hữu]
│   │   │   │   │   ├── automation-hub/                                              # Tích hợp bên ngoài, tự động hóa và AI
│   │   │   │   │   │   ├── ai-copilot/                                              # Trợ lý AI hỗ trợ thao tác nghiệp vụ [trống]
│   │   │   │   │   │   ├── external-integrations/                                   # Kết nối Google, GitHub, Zalo, email… [trống]
│   │   │   │   │   │   └── workflow-rules/                                          # Quy tắc tự động hóa và luồng xử lý [trống]
│   │   │   │   │   ├── checklog/                                                    # Nhật ký hoạt động và truy vết kiểm toán [có mã hiện hữu]
│   │   │   │   │   ├── organization/                                                # Thông tin doanh nghiệp và chính sách vận hành
│   │   │   │   │   │   ├── company-profile/                                         # Thông tin doanh nghiệp; chưa triển khai [trống]
│   │   │   │   │   │   └── work-policies/                                           # Giờ làm, IP văn phòng, ngày lễ và chính sách [trống]
│   │   │   │   │   ├── index.ts                                                     # Public exports cho composition
│   │   │   │   │   ├── tenant-system.accounts.module.ts
│   │   │   │   │   └── tenant-system.module.ts                                      # Ghép các chức năng đã có; không tạo endpoint giả
│   │   │   │   └── work-management/                                                 # Quản lý công việc, phối hợp và dự án
│   │   │   │       ├── coordination/                                                # Điều phối, trao đổi và không gian làm việc
│   │   │   │       │   ├── internal-chat/                                           # Trao đổi nội bộ; hiện là chủ đề/bình luận, chưa realtime [có mã hiện hữu]
│   │   │   │       │   ├── knowledge-sop/                                           # Ghi chú/tri thức; chưa có quy trình SOP đầy đủ [có mã hiện hữu]
│   │   │   │       │   ├── notifications/                                           # Thông báo trong ứng dụng, nhắc hạn và đa kênh [có mã hiện hữu]
│   │   │   │       │   ├── tickets-approvals/                                       # Đề xuất và cập nhật kết quả xử lý; chưa có RBAC [có mã hiện hữu]
│   │   │   │       │   └── workspace-today/                                         # Dashboard, tiện ích và tổng quan công việc [có mã hiện hữu]
│   │   │   │       │       ├── calendar/                                            # Lịch họp, sự kiện và thời gian tập trung hiện có [có mã hiện hữu]
│   │   │   │       │       └── reports/                                             # Chỉ số tổng hợp và báo cáo công việc hiện có [có mã hiện hữu]
│   │   │   │       ├── projects/                                                    # Tổ chức dự án, nghiệm thu và ghi nhận thời gian
│   │   │   │       │   ├── milestones-qa/                                           # Mốc bàn giao, kiểm tra chất lượng và nghiệm thu [trống]
│   │   │   │       │   ├── project-spaces/                                          # Thông tin, mục tiêu và tiến độ dự án [có mã hiện hữu]
│   │   │   │       │   └── timesheets/                                              # Ghi nhận và tổng hợp thời gian làm việc [trống]
│   │   │   │       ├── work/                                                        # Thực hiện và theo dõi công việc hằng ngày
│   │   │   │       │   ├── kanban/                                                  # Bảng task theo trạng thái và thao tác kéo thả [trống]
│   │   │   │       │   ├── task-comments/                                           # Bình luận gắn với task [trống]
│   │   │   │       │   ├── task-workflow/                                           # Máy trạng thái task, hoãn/hủy/làm lại [trống]
│   │   │   │       │   └── tasks/                                                   # Task, người thực hiện, hạn, tiến độ và checklist [có mã hiện hữu]
│   │   │   │       │       ├── dto/                                                 # Zod DTO và validation riêng của chức năng
│   │   │   │       │       │   └── tasks.dto.ts
│   │   │   │       │       ├── entities/                                            # Entity bổ sung khi cần [trống]
│   │   │   │       │       ├── guards/                                              # Guard riêng khi có xác thực/phân quyền [trống]
│   │   │   │       │       ├── listeners/                                           # Listener riêng khi có xử lý sự kiện [trống]
│   │   │   │       │       ├── middlewares/                                         # Middleware riêng khi cần [trống]
│   │   │   │       │       ├── prisma/                                              # Model database riêng; seed chỉ thêm khi có
│   │   │   │       │       │   └── task.prisma
│   │   │   │       │       ├── index.ts                                             # Public exports cho composition
│   │   │   │       │       ├── tasks.controller.ts
│   │   │   │       │       ├── tasks.module.ts
│   │   │   │       │       ├── tasks.repository.ts
│   │   │   │       │       └── tasks.service.ts
│   │   │   │       ├── index.ts                                                     # Public exports cho composition
│   │   │   │       ├── work-management.insights.module.ts                           # Tổng hợp qua public service của các chức năng
│   │   │   │       └── work-management.module.ts                                    # Ghép các chức năng đã có; không tạo endpoint giả
│   │   │   ├── shared/                                                              # Tiện ích thuần; hiện chưa có implementation
│   │   │   │   ├── constants/                                                       # Hằng số hạ tầng [trống]
│   │   │   │   └── helpers/                                                         # Hàm trợ giúp hạ tầng [trống]
│   │   │   ├── app.module.ts                                                        # Ghép CoreModule và 4 main module
│   │   │   ├── bootstrap.ts                                                         # Khởi tạo Nest, prefix API và xử lý lỗi
│   │   │   └── main.ts                                                              # Điểm chạy backend
│   │   ├── test/                                                                    # Hỗ trợ kiểm thử với database riêng
│   │   │   ├── database.mjs
│   │   │   └── identity.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                                                                         # Frontend Next.js 16
│       ├── public/                                                                  # Font và các file public/download
│       ├── src/                                                                     # Mã nguồn frontend
│       │   ├── app/                                                                 # Định tuyến và layout theo quy ước Next.js
│       │   │   ├── (auth)/                                                          # Trang xác thực [trống]
│       │   │   ├── (error-pages)/                                                   # Trang lỗi chuyên biệt [trống]
│       │   │   ├── api/                                                             # HTTP proxy chuyển request tới NestJS
│       │   │   │   └── [...path]/
│       │   │   │       └── route.ts
│       │   │   ├── crm/
│       │   │   ├── design-system/
│       │   │   │   └── page.tsx
│       │   │   ├── design-tokens/
│       │   │   │   └── page.tsx
│       │   │   ├── hr-management/
│       │   │   │   ├── attendance/
│       │   │   │   └── leaves/
│       │   │   ├── tenant-system/
│       │   │   │   ├── accounts/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── checklog/                                                     # Trang nhật ký tập trung
│       │   │   │       └── page.tsx
│       │   │   ├── work-management/
│       │   │   │   ├── calendar/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── internal-chat/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── kanban/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── knowledge-sop/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── notifications/
│       │   │   │   ├── projects/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── reports/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── tasks/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── tickets-approvals/
│       │   │   │       └── page.tsx
│       │   │   ├── layout.tsx                                                       # Font, CSS, providers, session boundary và AppShell
│       │   │   ├── not-found.tsx                                                    # Trang 404 gốc của Next.js
│       │   │   └── page.tsx
│       │   ├── core/                                                                # Hạ tầng, khung giao diện và công cụ UI
│       │   │   ├── config/                                                          # Đăng ký menu, feature và form công khai
│       │   │   │   ├── feature-forms.ts
│       │   │   │   └── feature-registry.ts
│       │   │   ├── constants/                                                       # Hằng số hạ tầng frontend [trống]
│       │   │   ├── context/                                                         # Provider của khung ứng dụng
│       │   │   │   └── providers.tsx
│       │   │   ├── hooks/                                                           # Hook hạ tầng [trống]
│       │   │   ├── layout/                                                          # Header, sidebar và dialog tạo mới toàn ứng dụng
│       │   │   │   ├── app-shell.tsx
│       │   │   │   └── workspace-create.tsx
│       │   │   ├── lib/                                                             # Tiện ích class/CSS của shell
│       │   │   │   └── utils.ts
│       │   │   ├── shared/                                                          # Tiện ích hạ tầng [trống; không gom nghiệp vụ]
│       │   │   ├── types/                                                           # Kiểu hạ tầng frontend [trống]
│       │   │   └── ui/                                                              # UI riêng của shell, token và công cụ thiết kế
│       │   │       ├── design-system/                                               # Catalog component và trang design tokens
│       │   │       │   ├── api/
│       │   │       │   ├── lib/
│       │   │       │   ├── schema/
│       │   │       │   └── ui/
│       │   │       ├── primitives/                                                  # Component nền phục vụ shell
│       │   │       │   ├── button.tsx
│       │   │       │   ├── forms.tsx
│       │   │       │   ├── foundations.tsx
│       │   │       │   ├── icon.tsx
│       │   │       │   ├── overlays.tsx
│       │   │       │   ├── preferences.tsx
│       │   │       │   └── workspace.tsx
│       │   │       └── styles/                                                      # CSS nền, theme và token sinh tự động
│       │   │           ├── globals.css
│       │   │           ├── token-theme.css
│       │   │           └── tokens.css
│       │   ├── features/                                                            # Cây chức năng đối xứng backend
│       │   │   ├── crm/                                                             # Khách hàng, bán hàng và hậu mãi; chưa có nghiệp vụ
│       │   │   │   ├── commercial/                                                  # Báo giá, phạm vi công việc và hợp đồng
│       │   │   │   │   ├── contracts/                                               # Hợp đồng và vòng đời thực hiện [trống]
│       │   │   │   │   └── quotations-sow/                                          # Báo giá và phạm vi công việc (SOW) [trống]
│       │   │   │   ├── customer-success/                                            # Công nợ, cổng khách hàng và chăm sóc sau bán
│       │   │   │   │   ├── after-sales/                                             # Chăm sóc và hỗ trợ sau bán [trống]
│       │   │   │   │   ├── customer-portal/                                         # Cổng làm việc dành cho khách hàng [trống]
│       │   │   │   │   └── receivables/                                             # Công nợ và theo dõi khoản phải thu [trống]
│       │   │   │   └── presales/                                                    # Tiếp nhận và tìm hiểu khách hàng tiềm năng
│       │   │   │       ├── discovery-briefs/                                        # Khảo sát nhu cầu và tóm tắt yêu cầu khách hàng [trống]
│       │   │   │       └── leads-customers/                                         # Khách hàng tiềm năng và hồ sơ khách hàng [trống]
│       │   │   ├── hr-management/                                                   # Tổ chức nhân sự; đã có hồ sơ tối thiểu phục vụ tài khoản
│       │   │   │   ├── attendance/                                                  # Ca làm, điểm danh, quân số và báo cáo công
│       │   │   │   │   ├── attendance-reports/                                      # Tổng hợp công và báo cáo chấm công [trống]
│       │   │   │   │   ├── checkin-explanations/                                    # Gửi và duyệt giải trình điểm danh [trống]
│       │   │   │   │   ├── daily-checkin/                                           # Check-in/out, trạng thái và kiểm tra IP [trống]
│       │   │   │   │   ├── shifts-schedules/                                        # Ca làm và lịch làm việc của nhân viên [trống]
│       │   │   │   │   └── workforce-board/                                         # Theo dõi quân số và trạng thái nhân sự [trống]
│       │   │   │   ├── employees/                                                   # Hồ sơ nhân viên và công suất làm việc
│       │   │   │   │   ├── employee-directory/                                      # Hồ sơ, danh bạ và bố trí nhân sự [trống]
│       │   │   │   │   └── resource-capacity/                                       # Công suất và khả năng nhận việc của nhân sự [trống]
│       │   │   │   ├── leaves/                                                      # Đơn nghỉ phép và xét duyệt
│       │   │   │   │   ├── leave-approvals/                                         # Xét duyệt đơn nghỉ và kết quả xử lý [trống]
│       │   │   │   │   └── leave-requests/                                          # Đơn nghỉ phép, nghỉ ốm và làm việc từ xa [trống]
│       │   │   │   └── organization/                                                # Cơ cấu phòng ban và chức danh
│       │   │   │       ├── departments-teams/                                       # Quản lý phòng ban [trống]
│       │   │   │       └── positions-grades/                                        # Chức danh, chức vụ và cấp bậc nhân sự [trống]
│       │   │   ├── tenant-system/                                                   # Quản trị doanh nghiệp, tài khoản và tích hợp
│       │   │   │   ├── access-control/                                              # Danh tính đăng nhập, quyền và quản trị truy cập
│       │   │   │   │   ├── accounts/                                                # Tài khoản và phiên đăng nhập [có mã hiện hữu]
│       │   │   │   │   ├── roles-permissions/                                       # Vai trò, quyền và phạm vi dữ liệu [trống]
│       │   │   │   │   └── tenant-auth/                                             # Đăng nhập và xác thực trong doanh nghiệp [trống]
│       │   │   │   ├── automation-hub/                                              # Tích hợp bên ngoài, tự động hóa và AI
│       │   │   │   │   ├── ai-copilot/                                              # Trợ lý AI hỗ trợ thao tác nghiệp vụ [trống]
│       │   │   │   │   ├── external-integrations/                                   # Kết nối Google, GitHub, Zalo, email… [trống]
│       │   │   │   │   └── workflow-rules/                                          # Quy tắc tự động hóa và luồng xử lý [trống]
│       │   │   │   ├── checklog/                                                    # Tra cứu nhật ký tập trung và chi tiết sự kiện [có mã hiện hữu]
│       │   │   │   └── organization/                                                # Thông tin doanh nghiệp và chính sách vận hành
│       │   │   │       ├── company-profile/                                         # Thông tin doanh nghiệp; chưa triển khai [trống]
│       │   │   │       └── work-policies/                                           # Giờ làm, IP văn phòng, ngày lễ và chính sách [trống]
│       │   │   └── work-management/                                                 # Quản lý công việc, phối hợp và dự án
│       │   │       ├── coordination/                                                # Điều phối, trao đổi và không gian làm việc
│       │   │       │   ├── internal-chat/                                           # Trao đổi nội bộ; hiện là chủ đề/bình luận, chưa realtime [có mã hiện hữu]
│       │   │       │   ├── knowledge-sop/                                           # Ghi chú/tri thức; chưa có quy trình SOP đầy đủ [có mã hiện hữu]
│       │   │       │   ├── notifications/                                           # Thông báo trong ứng dụng, nhắc hạn và đa kênh [trống]
│       │   │       │   ├── tickets-approvals/                                       # Đề xuất và cập nhật kết quả xử lý; chưa có RBAC [có mã hiện hữu]
│       │   │       │   └── workspace-today/                                         # Dashboard, tiện ích và tổng quan công việc [có mã hiện hữu]
│       │   │       │       ├── calendar/                                            # Lịch họp, sự kiện và thời gian tập trung hiện có [có mã hiện hữu]
│       │   │       │       └── reports/                                             # Chỉ số tổng hợp và báo cáo công việc hiện có [có mã hiện hữu]
│       │   │       ├── projects/                                                    # Tổ chức dự án, nghiệm thu và ghi nhận thời gian
│       │   │       │   ├── milestones-qa/                                           # Mốc bàn giao, kiểm tra chất lượng và nghiệm thu [trống]
│       │   │       │   ├── project-spaces/                                          # Thông tin, mục tiêu và tiến độ dự án [có mã hiện hữu]
│       │   │       │   └── timesheets/                                              # Ghi nhận và tổng hợp thời gian làm việc [trống]
│       │   │       └── work/                                                        # Thực hiện và theo dõi công việc hằng ngày
│       │   │           ├── kanban/                                                  # Bảng task theo trạng thái và thao tác kéo thả [có component FE]
│       │   │           ├── task-comments/                                           # Bình luận gắn với task [có component FE]
│       │   │           ├── task-workflow/                                           # Máy trạng thái task, hoãn/hủy/làm lại [trống]
│       │   │           └── tasks/                                                   # Task, người thực hiện, hạn, tiến độ và checklist [có mã hiện hữu]
│       │   │               ├── actions/                                             # Server actions khi cần [trống]
│       │   │               ├── api/                                                 # HTTP transport và client riêng
│       │   │               │   ├── client.ts
│       │   │               │   └── http.ts
│       │   │               ├── components/                                          # Trang, form, view và component riêng
│       │   │               │   ├── primitives/                                      # Bản component nền do chức năng tự sở hữu
│       │   │               │   ├── entrypoints.tsx
│       │   │               │   ├── page.tsx
│       │   │               │   ├── record-form.tsx
│       │   │               │   └── styles.module.css
│       │   │               ├── hooks/                                               # Hook và trạng thái riêng của chức năng
│       │   │               │   └── use-records.ts
│       │   │               ├── constants.ts                                         # Metadata, trường và tùy chọn của chức năng
│       │   │               ├── index.ts                                             # Public exports cho composition
│       │   │               └── types.ts                                             # Kiểu dữ liệu/schema transport riêng của FE
│       │   └── icons/                                                               # SVG và ánh xạ icon điều hướng
│       ├── AGENTS.md
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/                                                                        # Package hạ tầng dùng trong workspace
│   └── database/                                                                    # Prisma client/types, cấu hình và lịch sử migration
│       ├── generated/                                                               # Prisma client tự sinh, không sửa tay
│       ├── prisma/                                                                  # Cấu hình schema, migration và seed
│       │   ├── migrations/                                                          # Lịch sử SQL được giữ nguyên
│       │   ├── schema/                                                              # Điểm đọc schema; không sao chép model nghiệp vụ
│       │   │   ├── features                                                         # Symlink → ../../../../apps/api/src/features (model gốc)
│       │   │   └── base.prisma                                                      # Datasource PostgreSQL và generator, không chứa model
│       │   └── seed/                                                                # Chưa có dữ liệu seed; để trống
│       ├── index.ts                                                                 # Public export PrismaClient, Prisma và model types
│       ├── package.json
│       ├── prisma.config.ts                                                         # Vị trí schema/migration và kết nối database
│       └── tsconfig.json
├── docs/                                                                            # Tài liệu kiến trúc, chuyển đổi và kiểm thử
├── scripts/                                                                         # Dựng cấu trúc, build token và kiểm tra tự động
├── tests/                                                                           # API integration, browser và design token tests
├── tokens/                                                                          # Nguồn design tokens và tài liệu thiết kế
├── feature-structure.json                                                           # Danh mục 4 nhóm/39 chức năng; dùng dựng thư mục
├── modules.json                                                                     # Ánh xạ 14 implementation dữ liệu, route và model
├── package.json                                                                     # Workspace và các lệnh điều phối dự án
├── package-lock.json                                                                # Khóa phiên bản dependency
├── playwright.config.ts
├── eslint.config.mjs
├── AGENTS.md                                                                        # Quy tắc làm việc và ranh giới module
├── agent.md
├── Cau Truc Thu Muc (1).md                                                          # Tài liệu cây thư mục hiện tại
└── README.md
```

## Quy tắc cấu trúc

- Mỗi chức năng đã triển khai tự sở hữu component, hook, API client, DTO/types và model; không dùng repository hoặc implementation nội bộ của chức năng khác.
- BE chưa có thì để trống các thư mục prisma/dto/entities/guards/middlewares/listeners; FE chưa có thì để trống components/hooks/api/actions. Không tạo controller/service/page/seed chạy rỗng.
- Core chỉ chứa hạ tầng và composition. Các main Nest module chưa có chức năng hiện chỉ là container, chưa có API nghiệp vụ; route trực tiếp dưới app; có xác thực và quyền quản trị tài khoản tối thiểu.
- `packages/database/prisma/schema/base.prisma` chỉ khai báo datasource/generator. Link `schema/features` đọc model gốc tại BE, không nhân đôi schema; generated client không sửa tay.
- Git không lưu thư mục rỗng. `feature-structure.json` và `npm run structure:prepare` tái tạo các nhánh trống sau checkout/install; không cần file placeholder.
- Các thư mục phụ thuộc/vận hành `.local`, `node_modules`, `.next`, `dist`, `test-results` và `playwright-report` không được triển khai chi tiết trong tài liệu này.

Bảng đối chiếu vị trí cũ → mới và phạm vi triển khai: [docs/FOLDER-MAPPING.md](docs/FOLDER-MAPPING.md).
