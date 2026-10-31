# Cấu trúc thư mục hiện tại — OneOps

Cập nhật theo mã nguồn thực tế: **4 module chính, 39 chức năng con đối xứng FE/BE**, với **29 chức năng dữ liệu hoàn chỉnh** (9 Record APIs, 20 Resource APIs) và **46 models** Prisma thuộc quyền sở hữu riêng của từng chức năng.

- `[trống]`: chỉ có thư mục cấu trúc chuẩn; chưa tạo implementation, API hoặc trang giả.
- `[đã triển khai đầy đủ]`: có đầy đủ mã nguồn FE/BE, Controller, Service, Repository, DTO và Model Prisma.
- `[view FE]`: component hiển thị chuyên biệt phía client, tương tác qua public interface của module sở hữu dữ liệu.
- Cây rút gọn phần lặp trong từng chức năng; không liệt kê nội dung dependency, cache và đầu ra biên dịch.

```text
OneOps/
├── apps/                                                                            # Các ứng dụng chạy của hệ thống
│   ├── api/                                                                         # Backend NestJS (Port 4000)
│   │   ├── src/                                                                     # Mã nguồn backend
│   │   │   ├── core/                                                                # Hạ tầng backend; không chứa nghiệp vụ
│   │   │   │   ├── auth/                                                            # Actor context hạ tầng xác thực (actor-context.ts)
│   │   │   │   ├── database/                                                        # Kết nối và vòng đời Prisma/PostgreSQL (database.module.ts)
│   │   │   │   ├── events/                                                          # Hạ tầng phát sự kiện thông báo nội bộ (notification-events.ts)
│   │   │   │   ├── filters/                                                         # Chuẩn hóa lỗi HTTP (errors.filter.ts)
│   │   │   │   ├── pipes/                                                           # Kiểm tra và biến đổi đầu vào Zod (validation.pipe.ts)
│   │   │   │   └── core.module.ts
│   │   │   ├── features/                                                            # 4 module chính và các chức năng con
│   │   │   │   ├── crm/                                                             # Khách hàng, bán hàng và hậu mãi (khung module)
│   │   │   │   │   ├── commercial/                                                  # Báo giá và hợp đồng [trống]
│   │   │   │   │   │   ├── contracts/                                               # [trống]
│   │   │   │   │   │   └── quotations-sow/                                          # [trống]
│   │   │   │   │   ├── customer-success/                                            # Chăm sóc và sau bán [trống]
│   │   │   │   │   │   ├── after-sales/                                             # [trống]
│   │   │   │   │   │   ├── customer-portal/                                         # [trống]
│   │   │   │   │   │   └── receivables/                                             # [trống]
│   │   │   │   │   ├── presales/                                                    # Tiền bán hàng [trống]
│   │   │   │   │   │   ├── discovery-briefs/                                        # [trống]
│   │   │   │   │   │   └── leads-customers/                                         # [trống]
│   │   │   │   │   ├── crm.module.ts                                                # Composition container
│   │   │   │   │   └── index.ts                                                     # Public exports
│   │   │   │   ├── hr-management/                                                   # Quản lý nhân sự và tổ chức (11/11 hoàn thiện)
│   │   │   │   │   ├── attendance/                                                  # Chấm công & Điểm danh
│   │   │   │   │   │   ├── attendance-reports/                                      # Báo cáo chấm công & kỳ chốt công [đã triển khai đầy đủ]
│   │   │   │   │   │   ├── checkin-explanations/                                    # Đơn giải trình vi phạm [đã triển khai đầy đủ]
│   │   │   │   │   │   ├── daily-checkin/                                           # Điểm danh bấm giờ vào/ra [đã triển khai đầy đủ]
│   │   │   │   │   │   ├── shifts-schedules/                                        # Ca làm và phân ca nhân sự [đã triển khai đầy đủ]
│   │   │   │   │   │   └── workforce-board/                                         # Bảng theo dõi quân số hiện diện [đã triển khai đầy đủ]
│   │   │   │   │   ├── employees/                                                   # Hồ sơ nhân viên và công suất
│   │   │   │   │   │   ├── employee-directory/                                      # Danh bạ & hồ sơ nhân sự [đã triển khai đầy đủ]
│   │   │   │   │   │   └── resource-capacity/                                       # Định biên & Quỹ giờ dự án [đã triển khai đầy đủ]
│   │   │   │   │   ├── leaves/                                                      # Quản lý nghỉ phép
│   │   │   │   │   │   ├── leave-approvals/                                         # Xét duyệt đơn nghỉ phép [đã triển khai đầy đủ]
│   │   │   │   │   │   └── leave-requests/                                          # Đơn xin nghỉ phép [đã triển khai đầy đủ]
│   │   │   │   │   ├── organization/                                                # Cơ cấu phòng ban và chức danh
│   │   │   │   │   │   ├── departments-teams/                                       # Quản lý sơ đồ phòng ban hình cây [đã triển khai đầy đủ]
│   │   │   │   │   │   └── positions-grades/                                        # Chức danh và ngạch bậc [đã triển khai đầy đủ]
│   │   │   │   │   ├── hr-management.capacity.controller.ts                         # Capacity composition controller
│   │   │   │   │   ├── hr-management.capacity.service.ts                            # Capacity composition service
│   │   │   │   │   ├── hr-management.capacity.module.ts                             # Capacity composition module
│   │   │   │   │   ├── hr-management.leaves.controller.ts                           # Leaves composition controller
│   │   │   │   │   ├── hr-management.leaves.service.ts                              # Leaves composition service
│   │   │   │   │   ├── hr-management.leaves.module.ts                               # Leaves composition module
│   │   │   │   │   ├── hr-management.module.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── tenant-system/                                                   # Quản trị hệ thống, tài khoản và kiểm toán
│   │   │   │   │   ├── access-control/                                              # Quản lý truy cập và xác thực
│   │   │   │   │   │   ├── accounts/                                                # Vòng đời tài khoản [đã triển khai đầy đủ]
│   │   │   │   │   │   ├── roles-permissions/                                       # Vai trò, quyền hạn & PermissionGuard [đã triển khai đầy đủ]
│   │   │   │   │   │   └── tenant-auth/                                             # Phiên trượt, First Admin & SessionGuard [đã triển khai đầy đủ]
│   │   │   │   │   ├── automation-hub/                                              # Tự động hóa và tích hợp ngoài [trống]
│   │   │   │   │   │   ├── ai-copilot/                                              # [trống]
│   │   │   │   │   │   ├── external-integrations/                                   # [trống]
│   │   │   │   │   │   └── workflow-rules/                                          # [trống]
│   │   │   │   │   ├── checklog/                                                    # Nhật ký kiểm toán bất biến append-only [đã triển khai đầy đủ]
│   │   │   │   │   ├── organization/                                                # Thông tin và chính sách vận hành
│   │   │   │   │   │   ├── company-profile/                                         # Hồ sơ doanh nghiệp [trống]
│   │   │   │   │   │   └── work-policies/                                           # Chính sách giờ làm, IP văn phòng & ngày nghỉ [đã triển khai đầy đủ]
│   │   │   │   │   ├── accounts-credentials.ts                                      # Composition bridge tài khoản
│   │   │   │   │   ├── permission-audit.ts                                          # Composition bridge kiểm toán
│   │   │   │   │   ├── index.ts
│   │   │   │   │   └── tenant-system.module.ts
│   │   │   │   └── work-management/                                                 # Điều phối công việc, dự án và cộng tác (12/12 hoàn thiện)
│   │   │   │       ├── coordination/                                                # Điều phối và không gian làm việc
│   │   │   │       │   ├── internal-chat/                                           # Kênh trao đổi nội bộ theo chủ đề [đã triển khai đầy đủ]
│   │   │   │       │   ├── knowledge-sop/                                           # Kho tri thức và SOP quy trình [đã triển khai đầy đủ]
│   │   │   │       │   ├── notifications/                                           # Trung tâm thông báo SSE & Soft Delete [đã triển khai đầy đủ]
│   │   │   │       │   ├── tickets-approvals/                                       # Phiếu yêu cầu & phê duyệt [đã triển khai đầy đủ]
│   │   │   │       │   └── workspace-today/                                         # Tổng quan hôm nay, lịch & báo cáo [đã triển khai đầy đủ]
│   │   │   │       │       ├── calendar/                                            # Lịch sự kiện [đã triển khai đầy đủ]
│   │   │   │       │       └── reports/                                             # Báo cáo chỉ số [đã triển khai đầy đủ]
│   │   │   │       ├── projects/                                                    # Dự án, mốc tiến độ và chấm công
│   │   │   │       │   ├── milestones-qa/                                           # Mốc tiến độ & Cổng QA Gate [đã triển khai đầy đủ]
│   │   │   │       │   ├── project-spaces/                                          # Không gian quản trị dự án [đã triển khai đầy đủ]
│   │   │   │       │   └── timesheets/                                              # Chấm công thời gian thực 15 phút [đã triển khai đầy đủ]
│   │   │   │       ├── work/                                                        # Thực thi công việc hằng ngày
│   │   │   │       │   ├── kanban/                                                  # View Kanban tích hợp workflow [view FE]
│   │   │   │       │   ├── task-comments/                                           # API riêng bình luận & liên kết [đã triển khai đầy đủ]
│   │   │   │       │   ├── task-workflow/                                           # Máy trạng thái TR-02…TR-09 [đã triển khai đầy đủ]
│   │   │   │       │   └── tasks/                                                   # Nhiệm vụ, checklist, phân công [đã triển khai đầy đủ]
│   │   │   │       ├── work-management.composition.ts                               # Domain composition điều phối liên chức năng
│   │   │   │       ├── work-management.insights.module.ts                           # Tổng hợp chỉ số
│   │   │   │       ├── work-management.module.ts
│   │   │   │       └── index.ts
│   │   │   ├── app.module.ts                                                        # Ghép CoreModule và 4 main modules
│   │   │   ├── bootstrap.ts                                                         # Khởi tạo Nest, prefix API và filters
│   │   │   └── main.ts                                                              # Điểm chạy API
│   │   ├── test/                                                                    # Hỗ trợ kiểm thử database riêng
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                                                                         # Frontend Next.js 16 (Port 3002 - 26 routes)
│       ├── public/                                                                  # Tài nguyên tĩnh
│       ├── src/                                                                     # Mã nguồn frontend
│       │   ├── app/                                                                 # Route mỏng theo chuẩn Next.js App Router
│       │   │   ├── hr-management/                                                   # Routes nhân sự
│       │   │   │   ├── attendance/page.tsx                                          # Trang điểm danh hàng ngày
│       │   │   │   ├── attendance-reports/page.tsx                                  # Trang báo cáo chấm công
│       │   │   │   ├── capacity/page.tsx                                            # Trang công suất định biên
│       │   │   │   ├── employees/page.tsx                                           # Trang hồ sơ nhân viên
│       │   │   │   ├── explanations/page.tsx                                        # Trang giải trình điểm danh
│       │   │   │   ├── leave-approvals/page.tsx                                     # Trang xét duyệt nghỉ phép
│       │   │   │   ├── leaves/page.tsx                                              # Trang đơn xin nghỉ phép
│       │   │   │   ├── organization/page.tsx                                        # Trang sơ đồ phòng ban
│       │   │   │   ├── positions/page.tsx                                           # Trang chức danh ngạch bậc
│       │   │   │   ├── shifts/page.tsx                                              # Trang ca làm & phân ca
│       │   │   │   └── workforce/page.tsx                                           # Trang bảng quân số hiện diện
│       │   │   ├── tenant-system/                                                   # Routes quản trị
│       │   │   │   ├── accounts/page.tsx                                            # Trang quản lý tài khoản
│       │   │   │   ├── auth/page.tsx                                                # Trang đăng nhập / First Admin setup
│       │   │   │   ├── checklog/page.tsx                                            # Trang nhật ký kiểm toán
│       │   │   │   ├── roles-permissions/page.tsx                                   # Trang vai trò & phân quyền
│       │   │   │   └── work-policies/page.tsx                                       # Trang chính sách làm việc
│       │   │   ├── work-management/                                                 # Routes công việc
│       │   │   │   ├── calendar/page.tsx                                            # Trang lịch sự kiện
│       │   │   │   ├── internal-chat/page.tsx                                       # Trang trao đổi nội bộ
│       │   │   │   ├── kanban/page.tsx                                              # Trang bảng Kanban
│       │   │   │   ├── knowledge-sop/page.tsx                                       # Trang kho tri thức SOP
│       │   │   │   ├── milestones/page.tsx                                          # Trang mốc tiến độ & QA
│       │   │   │   ├── notifications/page.tsx                                       # Trang trung tâm thông báo
│       │   │   │   ├── projects/page.tsx                                            # Trang dự án
│       │   │   │   ├── reports/page.tsx                                             # Trang báo cáo
│       │   │   │   ├── tasks/page.tsx                                               # Trang danh sách công việc
│       │   │   │   ├── tickets-approvals/page.tsx                                   # Trang phiếu đề xuất
│       │   │   │   └── timesheets/page.tsx                                          # Trang chấm công
│       │   │   ├── design-system/page.tsx                                           # Thư viện component mẫu
│       │   │   ├── design-tokens/page.tsx                                           # Bảng tra cứu token
│       │   │   ├── page.tsx                                                         # Trang chủ (Workspace Today)
│       │   │   ├── layout.tsx                                                       # Root Layout, fonts, CSS nền, AppShell & Providers
│       │   │   └── not-found.tsx                                                    # Trang 404
│       │   ├── core/                                                                # Hạ tầng shell, Feature Registry, Design System
│       │   │   ├── config/                                                          # Đăng ký 26 menu và form tạo nhanh
│       │   │   ├── context/                                                         # SessionProvider và ApplicationProviders
│       │   │   ├── layout/                                                          # AppShell, Header, Sidebar, QuickCreate
│       │   │   └── ui/                                                              # Bộ UI Primitives và Design Tokens
│       │   ├── features/                                                            # 39 chức năng con đối xứng BE
│       │   └── icons/                                                               # Biểu tượng SVG hệ thống
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/                                                                        # Packages hạ tầng monorepo
│   └── database/                                                                    # Quản lý cơ sở dữ liệu PostgreSQL
│       ├── generated/                                                               # Client Prisma 7.10.1 sinh tự động
│       ├── prisma/
│       │   ├── migrations/                                                          # Lịch sử SQL migrations đa schema
│       │   └── schema/
│       │       ├── base.prisma                                                      # Datasource và generator
│       │       └── features                                                         # Junction trỏ sang 46 models gốc tại BE
│       ├── index.ts                                                                 # Public exports PrismaClient & models
│       ├── package.json
│       └── prisma.config.ts
├── graphify-out/                                                                    # Sơ đồ tri thức kiến trúc và tương tác
│   ├── OneOps-callflow.html                                                         # Sơ đồ Call-flow Mermaid tương tác (17 sections, 16 diagrams)
│   ├── graph.html                                                                   # Bản đồ tương tác mạng lưới (4.978 nodes, 13.126 edges)
│   ├── GRAPH_REPORT.md                                                              # Báo cáo trích xuất cấu trúc
│   └── wiki/                                                                        # 179 bài viết tài liệu hóa mã nguồn
├── docs/                                                                            # Tài liệu kiến trúc, hợp đồng và kiểm thử
├── scripts/                                                                         # Công cụ biên dịch token, check boundary
├── tests/                                                                           # Bộ kiểm thử tích hợp API và E2E
├── tokens/                                                                          # 187 semantic design tokens (source.json)
├── feature-structure.json                                                           # Danh mục 4 nhóm/39 chức năng
├── modules.json                                                                     # Ánh xạ các implementation dữ liệu hoàn chỉnh
├── package.json                                                                     # Monorepo configuration
├── AGENTS.md                                                                        # Quy tắc kiến trúc và chuẩn mực code
└── README.md                                                                        # Hướng dẫn tổng thể hệ thống
```

---

## Nguyên tắc cấu trúc cốt lõi

1. **Phân quyền sở hữu khép kín:** Mỗi chức năng đã triển khai tự sở hữu component, hook, API client, DTO, repository và model Prisma riêng biệt. Tuyệt đối không import repository hay delegate của chức năng khác.
2. **Không file giả:** Các chức năng chưa làm được giữ trống hoàn toàn; không tạo controller, service, page hay mock endpoint rỗng để che giấu phần chưa triển khai.
3. **Quản lý model gốc:** Toàn bộ 46 model Prisma gốc nằm trực tiếp tại `apps/api/src/features/<path>/prisma/*.prisma`. Link `packages/database/prisma/schema/features` là junction kết nối tới model gốc, loại bỏ hoàn toàn việc nhân đôi schema.
4. **Khôi phục thư mục trống:** Lệnh `npm run structure:prepare` sử dụng danh mục từ `feature-structure.json` để tự động khôi phục các thư mục rỗng sau khi clone hoặc checkout repository.
