# Kiến trúc OneOps theo file cấu trúc

Dự án dùng Next.js 16, NestJS, PostgreSQL và Prisma, tổ chức theo bốn miền: tenant-system, work-management, hr-management, crm. File `Cau Truc Thu Muc (1).md` tại root là chuẩn cấu trúc. Xem FOLDER-MAPPING.md để biết vị trí từng chức năng cũ và phần còn trống.

```text
packages/database/
  prisma/schema/base.prisma      # chỉ datasource/generator
  prisma/schema/features         # symlink tới model gốc dưới API features
  prisma/migrations/
  prisma/seed/                   # trống, chưa có seed
  generated/                     # tự sinh, không sửa
  index.ts                       # PrismaClient, Prisma, model types
apps/api/src/
  core/                          # database lifecycle, filter, pipe; phần chưa có để trống
  shared/constants/, helpers/    # trống
  features/
    tenant-system/
    work-management/
    hr-management/
    crm/
apps/web/src/
  app/                           # route trực tiếp dưới 4 miền; layout gốc giữ shell
  app/(auth)/, (error-pages)/     # trống
  core/                          # layout/context/config/UI tools/tokens
  icons/
  features/                      # đối xứng 39 chức năng con với BE
```

## Sở hữu và tích hợp

Từng feature sở hữu components/hooks/api/types/constants riêng ở FE và controller/service/repository/DTO/model riêng ở BE nếu đã được viết. Không có generic CRUD factory hoặc base business repository. Các primitive tương tự trong các feature vẫn được sở hữu độc lập.

Frontend feature không import business implementation từ core hoặc nội bộ feature khác. Hai tích hợp công khai có chủ đích: Tasks dùng KanbanBoard và TaskComments qua public index, truyền dữ liệu/callback; hai view không import repository, hook, API hay component nội bộ của Tasks. Core/route chỉ ghép public feature exports.

Backend feature chỉ truy cập delegate Prisma của chính mình. Các main module và `work-management.insights.module.ts` là composition root, chỉ sử dụng public service/module exports. Core hạ tầng không import nghiệp vụ. Root AppModule ghép CoreModule và đúng 4 main module, CRM hiện vẫn là composition container trống.

DTO validation BE và transport types/schema FE nằm trong feature của từng bên. Frontend không import NestJS, Prisma, database package hoặc source BE. Backend chưa có và frontend chưa có không được lấp bằng stub/endpoint giả.

## Database và vận hành

Các implementation công việc giữ namespace work_* hiện có. Tài khoản và các phần phụ thuộc bổ sung namespace tenant__, hr_employees và work_notifications. Prisma đọc trực tiếp các model tại features/_/_/_/prisma thông qua link cấu hình, không nhân đôi schema. Database package chỉ phát client/types; connection lifecycle và PostgreSQL adapter ở API core/database.

`npm run db:generate` generate và build package database trước khi API được biên dịch. `db:migrate`/`db:dev` chạy tại package database; migration history được di chuyển nguyên vẹn. Chuyển thư mục không tạo SQL mới hoặc xóa dữ liệu. localStorage vẫn chỉ dùng cho UI preferences.

Optimistic version, strict Zod, chuẩn hóa code, transaction/list pagination và kiểm tra ngày/giờ được giữ. API/E2E chỉ dùng database có tên kết thúc _test. Các điểm tích hợp backend vẫn là hợp đồng giữa chức năng, không thể đảm bảo tuyệt đối không có merge conflict tại cấu hình/lockfile/migration.

## Kiểm tra

Boundary check xác minh 4 nhóm, 39 thư mục đối xứng, artifact/model/delegate cho 14 implementation hiện hữu, gồm 10 phần có FE/BE và 4 phần chỉ BE; chặn import nội bộ trái phép và tái tạo cấu trúc cũ. Unused check đọc import graph của source và entrypoint database package. Build chạy cả hai kiểm tra. Empty folders tái lập qua structure:prepare, không cần file .gitkeep/source giả.

Giữ UI/UX, catalog/design tokens. Đã có authentication và quyền quản trị tài khoản tối thiểu. Chưa có RBAC đầy đủ cho nghiệp vụ khác, event bus, realtime, attendance/leaves hoặc CRM.

Company-profile hiện để trống; departments-teams thuộc HR có trách nhiệm quản lý phòng ban, chưa có code. Audit-backups đã bỏ; checklog là nhánh nhật ký được giữ. Bảng work_teams cũ được giữ trong database/migration history nhưng không còn model hoặc endpoint trong runtime.

## Tích hợp tài khoản

`tenant-system.accounts.module.ts` nối Accounts, Tenant-auth, Roles-permissions, Checklog, HR Employee-directory và Work Tasks/Notifications qua public service. Transaction được truyền qua các hợp đồng để khóa tài khoản, thu hồi phiên, đánh dấu task, gửi thông báo và ghi audit cùng thành công hoặc cùng rollback. Repository mỗi feature chỉ truy cập model của chính mình.

Registry hỗ trợ nhiều model trong một feature và các service chỉ có BE; không cần file FE giả. Session guard core phụ thuộc một policy port do composition cung cấp. Root layout ghép public AccountSessionBoundary; primitive/token vẫn được sở hữu theo quy tắc cũ. Xem [ACCOUNTS.md](ACCOUNTS.md) về setup, API và các giới hạn tích hợp khi Department/Team chưa triển khai.

Checklog đã có API/UI tra cứu tập trung tại `/tenant-system/checklog`, port quyền đọc riêng và redaction đệ quy khi ghi/đọc. Lịch sử Accounts vẫn dùng cùng nguồn dữ liệu. Xem [CHECKLOG.md](CHECKLOG.md).
