# OneOps

Hệ thống quản lý công việc dùng **Next.js / React / Tailwind**, **NestJS**, **PostgreSQL / Prisma**. Có bốn module chính: `tenant-system`, `work-management`, `hr-management`, `crm`.

Hiện có công việc/Kanban, dự án, tổng quan, lịch, đề xuất, trao đổi, ghi chú và báo cáo. Các chức năng chưa triển khai vẫn để trống; đã có quản trị tài khoản và đăng nhập bằng phiên. Chưa có SSO, RBAC đầy đủ cho toàn bộ nghiệp vụ, chat realtime hay upload tệp.

## 1. Cài đặt và chạy

Yêu cầu **Node.js ≥ 22.12**, npm và **PostgreSQL 16 local** đang chạy. Tạo role/database dev và đặt `DATABASE_URL` trong `apps/api/.env` cho khớp trước khi chạy các lệnh database. Chạy từ thư mục gốc:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run prepare:dev
npm run db:migrate
npm run accounts:bootstrap  # Chỉ lần đầu: nhập thông tin quản trị trong terminal
npm run dev
```

Hai lệnh `cp` dành cho lần đầu; giữ file env đã cấu hình khi pull lần sau. `npm ci` tự tạo lại khung thư mục trống; không cần `.gitkeep`. `npm run dev` cũng tự chuẩn bị cấu trúc, token và Prisma client.

- Frontend: [localhost:3002](http://localhost:3002).
- API: [workspace/summary](http://127.0.0.1:4000/api/v1/workspace/summary).
- Tài khoản: [/tenant-system/accounts](http://localhost:3002/tenant-system/accounts). Sau khi tạo quản trị bằng lệnh bootstrap, đăng nhập để sử dụng hệ thống. Xem [hướng dẫn tài khoản](docs/ACCOUNTS.md).
- Nhật ký tập trung: [/tenant-system/checklog](http://localhost:3002/tenant-system/checklog), dành cho Quản trị cấp cao. Xem [hướng dẫn Checklog](docs/CHECKLOG.md).
- Bộ UI: [/design-system](http://localhost:3002/design-system), [/design-tokens](http://localhost:3002/design-tokens).
- `apps/api/.env`: `DATABASE_URL`, `HOST`, `PORT`; `apps/web/.env.local`: `API_ORIGIN`. Không commit file env hoặc đưa database URL ra frontend.
- Dự án dùng PostgreSQL local, không cần Docker. Cấu hình mẫu dùng `127.0.0.1:55432`, database/role `etctha`; nếu máy bạn dùng port hoặc tài khoản khác, cập nhật `DATABASE_URL`. Database không được lưu trong Git; mỗi người chuẩn bị database riêng.

Sau khi pull: `npm ci` → `npm run prepare:dev` → đọc migration mới → `npm run db:migrate` trên database dev → `npm run dev`. `db:migrate` áp dụng migration đã có; khi phát triển model mới, dùng `npm run db:dev -- --name <ten_migration>` trên database riêng và review SQL trước khi áp dụng. Không reset database hoặc chấp nhận DROP bảng ngoài phạm vi.

## 2. Viết code ở đâu?

```text
apps/web/src/
  app/                   # Route trực tiếp dưới 4 module, layout gốc giữ shell
  features/              # UI, hook, API client, types của từng chức năng
  core/                  # Hạ tầng, shell, cấu hình và bộ UI/token
apps/api/src/
  features/              # Controller/service/repository/DTO/Prisma của từng chức năng
  core/                  # Hạ tầng backend
packages/database/       # Prisma config, generated client và lịch sử migration
feature-structure.json   # Danh sách vị trí chức năng, khôi phục thư mục trống
modules.json             # Registry implementation dữ liệu, có khai báo phần chỉ BE
```

FE và BE dùng cùng `<feature-path>`. Ví dụ phòng ban:

```text
apps/web/src/features/hr-management/organization/departments-teams/
apps/api/src/features/hr-management/organization/departments-teams/
```

Tra đúng vị trí trong [cây thư mục](Cau%20Truc%20Thu%20Muc%20%281%29.md) trước khi làm. Không đổi tên/di chuyển module; phần chưa viết giữ trống. `company-profile` hiện trống, `audit-backups` đã bỏ, nhật ký thuộc `tenant-system/checklog`.

## 3. Giao module cho AI

Đọc [AGENTS.md](AGENTS.md) về kiến trúc, chuẩn code và UI. Có thể gửi AI mẫu sau, hoặc dùng [agent.md](agent.md):

```text
Đọc AGENTS.md trước khi làm.
Module/chức năng: <feature-path trong feature-structure.json>.
Phạm vi: <FE / BE / cả hai>.
Yêu cầu và tiêu chí hoàn thành: <mô tả>.
Giữ cấu trúc; chỉ sửa feature được giao và điểm tích hợp tối thiểu.
Component tự sở hữu trong feature; UI theo design-system/token hiện có.
Không sửa module khác hoặc style toàn cục. Chạy kiểm tra và báo kết quả.
```

Mỗi người làm một nhánh/chức năng; không import nội bộ module khác, không gom nghiệp vụ vào shared. Route, menu, đăng ký Nest, registry và migration vẫn là điểm tích hợp có thể cùng sửa: giữ diff nhỏ và phối hợp trước khi merge. Hướng dẫn AI giúp giữ phạm vi; cần review diff và chạy checker để xác nhận.

## 4. Áp dụng bộ UI

Xem mẫu ở `/design-system`, token ở `/design-tokens`. Tạo component trong `components/primitives/` của **chính feature**, giữ token/variant của mẫu và đổi import về nội bộ feature. Không import UI của module khác.

Dùng token ngữ nghĩa như `bg-surface`, `text-foreground`, `border-border`, `rounded-control`; style riêng dùng CSS Module. Không tự hardcode bảng màu/font, sửa global CSS hoặc dựng theme riêng. Kiểm tra light/dark, comfortable/compact và mobile. Chỉ sửa `tokens/source.json` khi nhiệm vụ yêu cầu đổi bộ token; xem [hướng dẫn token](tokens/README.md).

## 5. Kiểm tra trước khi bàn giao

```sh
npm run architecture:check
npm run unused:check
npm run tokens:check
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Thay token: thêm `npm run test:tokens`. Thay API/database: thêm `npm run test:api`. Thay UI/route: thêm `npm run test:e2e` sau build. Riêng validation/mật khẩu tài khoản: `npm run test:accounts`.

API/E2E chỉ dùng database riêng kết thúc `_test` (mặc định `etctha_test`); chuẩn bị database test sẵn hoặc dùng tài khoản PostgreSQL có quyền tạo database test. E2E dùng web 3117/API 4117, mặc định Google Chrome trên macOS. Với Chromium Playwright: cài bằng `npx playwright install chromium`, chạy `PLAYWRIGHT_USE_BUNDLED=1 npm run test:e2e`; hoặc đặt `PLAYWRIGHT_CHROME_PATH` tới Chrome phù hợp.

Chi tiết ranh giới: [kiến trúc](docs/ARCHITECTURE.md). Bàn giao cần nêu file ngoài feature, migration/env, lệnh đã chạy và phần chưa làm.
