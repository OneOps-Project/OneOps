# Phân bổ theo “Cau Truc Thu Muc (1).md”

File gốc tại root là chuẩn đặt tên, cộng các nhánh được người dùng yêu cầu bổ sung bên dưới. Có đúng 4 nhóm chính, 39 thư mục chức năng con đối xứng FE/BE: tenant-system (9), work-management (12), hr-management (11), crm (7).

## Di chuyển phần đã có

Các đường dẫn bên dưới nằm dưới `apps/web/src/features/` và `apps/api/src/features/`.

| Chức năng cũ | Đường dẫn mới | Phạm vi được giữ |
| --- | --- | --- |
| dashboard | work-management/coordination/workspace-today | Dashboard và tiện ích hiện có |
| tasks | work-management/work/tasks | API và UI task, checklist, trạng thái hiện tại |
| projects | work-management/projects/project-spaces | Thông tin dự án hiện có |
| teams | Đã gỡ code và route cũ | company-profile để trống; không chuyển code sang departments-teams |
| requests | work-management/coordination/tickets-approvals | Đề xuất và cập nhật kết quả xử lý hiện có |
| messages | work-management/coordination/internal-chat | Chủ đề/trao đổi hiện có; chưa phải chat realtime |
| notes | work-management/coordination/knowledge-sop | Ghi chú/tri thức hiện có; chưa có quy trình SOP đầy đủ |
| calendar | work-management/coordination/workspace-today/calendar | Giữ lịch hiện có bên trong Workspace Today vì file mẫu không có nhánh lịch riêng |
| reports | work-management/coordination/workspace-today/reports | Giữ báo cáo hiện có bên trong Workspace Today vì file mẫu không có nhánh báo cáo riêng |
| Kanban trong tasks | work-management/work/kanban | Đã tách component FE thật; chưa có API/model riêng |
| Bình luận trong tasks | work-management/work/task-comments | Đã tách component FE thật; chưa có API/model riêng |

Hai nhánh calendar/reports là phần mở rộng bảo toàn chức năng có sẵn, không tạo thêm nhóm chính. Kanban và TaskComments nhận dữ liệu/callback qua public interface; dữ liệu vẫn thuộc Task API. Không tạo bản sao task, bảng Kanban hoặc bảng bình luận chỉ để lấp đầy cấu trúc.

## Phần chưa có được để trống

- tenant-system: company-profile, work-policies, tenant-auth, roles-permissions, accounts, checklog, external-integrations, workflow-rules, ai-copilot đều trống. company-profile hiện để trống, chỉ dành cho thông tin doanh nghiệp khi triển khai.
- work-management: task-workflow, notifications, milestones-qa, timesheets; BE riêng của kanban/task-comments cũng trống. Máy trạng thái 7 bước, @tag, deadline proposal, link preview, SLA, thông báo đa kênh chưa được viết thêm.
- hr-management: cả 11 chức năng con đều trống; không gán module đội nhóm hoặc đề xuất chung thành hệ thống hồ sơ nhân viên/nghỉ phép đã hoàn thiện.
- crm: cả 7 chức năng con đều trống.
- core/auth, events, realtime và các hạ tầng chưa có chỉ là thư mục, không có implementation giả.
- prisma/seed và seed của từng feature chưa có dữ liệu nên không tạo seed chạy rỗng.

Không tạo file controller/service/page/types/seed rỗng hoặc endpoint trả dữ liệu giả. CRM vẫn là composition container; HR đã có hồ sơ tối thiểu phục vụ Accounts. Route nằm trực tiếp dưới `app`; shell được ghép trong layout gốc, có session guard và quyền quản trị tài khoản tối thiểu.

## Đổi cấu trúc bên trong

- FE: ui → components, model → hooks, schema/definition.ts → constants.ts, contract riêng → types.ts; API/utility/primitives vẫn thuộc chức năng cần dùng. Không gom các component nghiệp vụ vào core.
- BE: api/controller.ts → `<feature>.controller.ts`, application/service.ts → `<feature>.service.ts`, module.ts → `<feature>.module.ts`, repository thành `<feature>.repository.ts`; model trong prisma/, Zod DTO trong dto/. Các thư mục entities/guards/middlewares/listeners chưa có implementation được để trống.
- application → core/layout, core/context và core/config. tooling/design-system → core/ui/design-system. CSS nền/token → core/ui/styles. SVG → src/icons.
- platform → core/database, core/filters, core/pipes. Root app.module chỉ ghép CoreModule và 4 nhóm chính. Tổng hợp công việc nằm ở composition của work-management.
- packages/contracts được bỏ: FE types và BE DTO nằm trong đúng feature, không import source backend vào frontend.

## Database chung, model vẫn riêng

`packages/database` sở hữu Prisma config, generated client, public index và migration history. File `prisma/schema/base.prisma` chỉ chứa datasource/generator. `prisma/schema/features` là directory symlink trỏ tới `apps/api/src/features` để Prisma đọc trực tiếp model gốc trong từng `prisma/`; không sao chép schema sang nguồn thứ hai.

Prisma validate/generate đã đọc được đủ 8 model. So sánh schema trước/sau bằng migrate diff trả “No difference detected”. Không đổi tên bảng/namespace hoặc chạy migration phá dữ liệu. Generated client phải được build trước API; root scripts đã điều phối thứ tự này.

## Route

Các trang hiện có nằm trong `app` theo tên mới. `/work-management/tasks` là danh sách, `/work-management/kanban` là bảng việc; `/work-management/projects` là dự án. Các nhánh chưa có FE không tạo page. URL cũ `/home`, `/tasks`, `/projects`... được chuyển tiếp tới route mới; API hiện hữu giữ URL để không làm đổi hợp đồng khi chỉ di chuyển thư mục.

## Thư mục rỗng và Git

Git không lưu thư mục rỗng. `feature-structure.json` lưu danh mục chuẩn; `npm run structure:prepare` khôi phục toàn bộ thư mục mà không cần `.gitkeep` hoặc source giả. Root prepare/install, prepare:dev và build chạy bước này. Các thư mục chức năng vẫn thật sự trống khi chưa được triển khai.

## Bổ sung theo yêu cầu sau file mẫu

Các nhánh dưới đây có ở cả apps/api/src/features và apps/web/src/features, chưa có implementation nên chỉ chứa thư mục cấu trúc trống:

```text
tenant-system/
├── access-control/
│   └── accounts/
└── checklog/

hr-management/
├── organization/
│   ├── departments-teams/ # Quản lý phòng ban
│   └── positions-grades/
└── attendance/
    ├── shifts-schedules/
    └── attendance-reports/
```

feature-structure.json khai báo checklog bằng danh sách rỗng để thể hiện feature trực tiếp dưới tenant-system, không thêm cấp trung gian. structure:prepare và boundary check hỗ trợ cả feature hai cấp và ba cấp. Không tạo account, đăng nhập, kiểm toán hoặc API nhân sự giả.

## Cập nhật 30/10/2026

Đã bỏ audit-backups khỏi cả FE/BE và manifest; checklog được giữ lại. Đã xóa code, model Prisma nguồn, route, menu, form registry và backend đăng ký của company-profile. company-profile chỉ còn cấu trúc thư mục trống cho hồ sơ doanh nghiệp. departments-teams có nhiệm vụ quản lý phòng ban và hiện chưa có implementation; không nhận code đội nhóm cũ.

Namespace work_teams và dữ liệu cũ trong PostgreSQL không bị DROP; chỉ bị gỡ khỏi Prisma client/runtime đang dùng. Migration history được giữ nguyên, không áp dụng migration xóa dữ liệu.
