# Quy tắc làm việc cho AI — OneOps

Áp dụng cho toàn repository. Đọc file này trước khi sửa mã; đọc thêm `AGENTS.md` ở thư mục con nếu có. `agent.md` là điểm dẫn tới hướng dẫn này, không phải một bộ quy tắc khác.

## 1. Xác định phạm vi trước khi làm

- Ghi rõ đường dẫn chức năng được giao, phần FE/BE cần làm và tiêu chí hoàn thành. Kiểm tra mã hiện có trước khi tạo file.
- Tra `feature-structure.json`, `Cau Truc Thu Muc (1).md` và `docs/ARCHITECTURE.md` để xác định vị trí. Không tự đổi tên, di chuyển hoặc tạo nhóm/module mới ngoài yêu cầu.
- Chỉ có bốn module chính: `tenant-system`, `work-management`, `hr-management`, `crm`. Tên nhóm nghiệp vụ và tên URL có thể khác nhau; không suy ra thư mục từ URL.
- Mặc định chỉ sửa bên trong chức năng được giao. Không dọn, format toàn repo hoặc sửa module khác nhân tiện. Không ghi đè thay đổi có sẵn của người khác.
- Nếu yêu cầu chưa xác định được chức năng sở hữu, làm rõ vị trí trước khi viết nghiệp vụ; không đặt tạm vào core/shared.

## 2. Đặt đúng file

Với `<feature-path>` lấy từ cấu trúc đã duyệt, ví dụ `hr-management/organization/departments-teams`:

```text
apps/web/src/features/<feature-path>/
  index.ts                  # Public exports khi có implementation
  components/               # Trang, form, UI của chức năng
    primitives/             # Component UI do chức năng tự sở hữu
    styles.module.css       # Style cục bộ khi cần
  hooks/                    # State và nghiệp vụ phía client
  api/                      # HTTP client, gọi API của chức năng
  actions/                  # Server Actions nếu thực sự cần
  types.ts                  # Transport types/schema FE
  constants.ts              # Cấu hình riêng
apps/api/src/features/<feature-path>/
  index.ts                  # Public exports
  <name>.module.ts
  <name>.controller.ts
  <name>.service.ts
  <name>.repository.ts
  dto/                      # Validate đầu vào/đầu ra
  prisma/                   # Model gốc của chức năng
  entities/, guards/, middlewares/, listeners/  # Chỉ viết khi cần
```

Đây là vị trí trách nhiệm, không yêu cầu tạo đủ file cho chức năng chưa triển khai. FE/BE chưa làm phải để trống; không sinh API giả, dữ liệu mẫu hay file placeholder để đủ cây. `npm run structure:prepare` khôi phục các thư mục trống sau checkout. `checklog` nằm trực tiếp dưới `tenant-system`, không thêm tầng giả.

Các mốc nghiệp vụ phải giữ: `departments-teams` quản lý phòng ban; `company-profile` hiện trống; `audit-backups` đã bỏ, nhật ký thuộc `tenant-system/checklog`. Chỉ triển khai phần trống khi nhiệm vụ yêu cầu. `calendar` và `reports` hiện nằm trong `work-management/coordination/workspace-today`; không tự di chuyển.

Route nằm trực tiếp trong `apps/web/src/app/<main>/...`; không tạo lại lớp bọc `(admin)`. `app/layout.tsx` giữ font, CSS, ApplicationProviders và AppShell. `src/features` chứa nghiệp vụ, không chứa route group. Các trang công cụ UI và trang chủ nằm trực tiếp dưới `app`.

## 3. Giữ ranh giới giữa các chức năng

- Mỗi chức năng tự định nghĩa UI/primitives, hook, HTTP client, types, constants, DTO, service, repository và model cần dùng. Không tạo shared business component, CRUD factory, base repository hoặc package contracts dùng chung.
- FE không import source của chức năng khác hoặc `core/ui/primitives`. Global CSS/token được nạp ở root layout là nền giao diện; không cần import trong từng feature.
- Hai ngoại lệ FE đã được kiểm tra cho phép: Tasks ghép `KanbanBoard` và `TaskComments` qua public `index.ts`, truyền dữ liệu/callback. Không mở rộng ngoại lệ hoặc import sâu để né kiểm tra.
- `index.ts` chỉ xuất giao diện công khai cần thiết; không xuất toàn bộ nội bộ/repository. Route và core composition tích hợp qua public exports.
- BE leaf feature không import feature khác. Tích hợp liên chức năng nằm ở composition của module chính, gọi public service; không truy cập repository/delegate của module khác. Tham khảo `work-management.insights.module.ts`.
- Controller xử lý HTTP; service xử lý nghiệp vụ; repository xử lý Prisma. Chỉ repository được import `@oneops/database` và sử dụng Database để truy vấn delegate do chức năng sở hữu.
- Core chỉ chứa hạ tầng hoặc composition, không nhận nghiệp vụ dùng lại. Core BE không import feature. FE không import NestJS, Prisma, `@oneops/database` hoặc source BE.
- Không tạo lại các thư mục cũ `src/modules`, `application`, `platform`, `tooling`, `packages/contracts` hoặc kho schema sao chép.

## 4. Dùng cùng bộ UI xuyên suốt

- Đọc `tokens/README.md`; xem `/design-system` và `/design-tokens` trước khi tạo giao diện mới.
- UI của feature nằm trong `components/primitives` của chính feature. Có thể lấy component mẫu làm bản khởi đầu, đổi toàn bộ import sang nội bộ feature rồi tự sở hữu mã đó; không kéo theo provider/demo không dùng.
- Giữ token ngữ nghĩa và biến thể của mẫu. Không tự đổi màu, font, spacing, chiều cao control, bo góc, shadow, layer hoặc tự dựng theme riêng.
- Dùng Tailwind utilities đã ánh xạ token và CSS Module cục bộ. Không thêm selector toàn cục hoặc override `body`, `:root`, `button`, `.btn` từ feature.
- Kiểm tra light/dark, comfortable/compact, mobile, keyboard và loading/empty/error. Không thêm provider thay đổi theme toàn cục bên trong feature.
- `tokens/source.json` là nguồn token duy nhất. Đổi token toàn hệ thống là thay đổi có phạm vi riêng, không phải cách sửa style của một module. Không sửa trực tiếp đầu ra đã sinh.

## Chuẩn code

- Thư mục/file dùng kebab-case; React component/type dùng PascalCase; biến/hàm dùng camelCase. Giữ convention hiện có, không đổi tên hàng loạt.
- Một file có trách nhiệm rõ; chỉ tạo abstraction và file thực sự được dùng. Không để import thừa, debug log hoặc code comment-out.
- Validate input bằng schema/DTO cục bộ; type rõ ở HTTP, props và public interface. Không dùng `any` hoặc ép kiểu để che dữ liệu chưa được kiểm tra.
- UI render, hook quản lý state/request, API client vận chuyển dữ liệu. Xử lý loading/error/empty, submit lặp và race condition; giữ dữ liệu form khi lỗi.
- Dùng HTML có ngữ nghĩa, label và accessible name; kiểm tra focus, keyboard, dialog và overflow trên mobile. Chỉ thêm `"use client"` khi cần.
- Không hardcode secret, URL API hay dữ liệu nghiệp vụ. Không nuốt lỗi hoặc trả thành công giả. Đọc tài liệu Next cục bộ trước khi sửa mã Next.
- Giữ variant UI mẫu, semantic utilities như `bg-surface`, `text-foreground`, `border-border`, `rounded-control`; control/density dùng token tương ứng. Không thêm màu hex/RGB, `!important`, z-index hoặc theme tùy ý.

## 5. Dữ liệu và migration

- Model gốc chỉ ở `apps/api/src/features/<feature-path>/prisma/*.prisma`. `packages/database/prisma/schema/features` là symlink tới đó; không thay bằng bản sao.
- `packages/database` giữ config, client và lịch sử migration. `base.prisma` chỉ giữ datasource/generator và danh sách namespace, không định nghĩa model nghiệp vụ.
- Không sửa `generated/`, `dist/`, `.next/`, migration đã áp dụng hoặc schema/model của chức năng khác.
- Khi cần thay đổi model, dùng database dev riêng và `npm run db:dev -- --name <ten_migration>`. Đọc toàn bộ SQL trước khi áp dụng/commit: Prisma có thể đề nghị DROP bảng cũ không còn model (đặc biệt `work_teams`). Không chấp nhận SQL ngoài phạm vi; không reset database hoặc tự xóa dữ liệu để sửa drift.
- Không tạo quan hệ khóa ngoại hoặc truy vấn chéo namespace khi chưa có thiết kế tích hợp được giao. Không dùng frontend/localStorage làm nguồn lưu nghiệp vụ; localStorage chỉ cho UI preferences.
- Giữ validation, pagination, transaction và optimistic version của API hiện có. Không bỏ kiểm tra version để tránh lỗi cập nhật đồng thời.
- Test xóa dữ liệu chỉ chạy trên database riêng có tên kết thúc `_test`. Không ghi secret hoặc dữ liệu cá nhân vào source, prompt mẫu hay log.

## 6. Các điểm tích hợp có thể phải sửa ngoài feature

Chỉ sửa các điểm dưới đây khi cần để chức năng được giao chạy được; giữ diff nhỏ, nêu rõ trong bàn giao và phối hợp khi nhiều người cùng sửa:

| Điểm                                                            | Khi cần sửa                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/web/src/app/<main>/.../page.tsx`                          | Thêm route mỏng, render public page export                       |
| `apps/web/src/core/config/feature-registry.ts`                  | Đăng ký menu/định nghĩa trang                                    |
| `apps/web/src/core/config/feature-forms.ts`                     | Đăng ký form tạo nhanh toàn ứng dụng nếu có                      |
| `apps/api/src/features/<main>/<main>.module.ts` và public index | Đăng ký Nest module trong đúng miền                              |
| `modules.json`                                                  | Đăng ký implementation và model thực, phân biệt resource/service |
| `packages/database/prisma/schema/base.prisma`                   | Bổ sung namespace mới, khớp registry                             |
| `packages/database/prisma/migrations/`                          | Thêm migration mới đã kiểm tra SQL                               |
| `tests/` và tài liệu cấu trúc                                   | Cập nhật kiểm tra/diễn giải cho hành vi mới                      |

`modules.json` hỗ trợ CRUD hiện hữu, `kind: "resource"` có FE/BE và `kind: "service"` chỉ có BE. `models`/`tables` khai báo đầy đủ model/bảng sở hữu; một namespace thuộc một implementation. Không tạo FE/controller giả cho service chỉ có BE hoặc tắt checker để vượt qua. Khi thêm model, cập nhật registry và migration tương ứng. Không tự mở rộng `feature-structure.json`, sửa lockfile/dependency hay token chung nếu nhiệm vụ không cần.

Tài khoản đã có xác thực bằng cookie thật, quyền quản trị tối thiểu và checklog. Đọc `docs/ACCOUNTS.md` trước khi sửa các tích hợp liên quan. `tenant-system.accounts.module.ts` là composition kết nối public service của Tenant, HR và Work; leaf feature vẫn không import chéo. Các API nghiệp vụ cần đăng nhập; test dùng fixture đăng nhập trên database `_test`. Không thêm bypass xác thực cho development hoặc tạo tài khoản mặc định.

## 7. Kiểm tra và bàn giao

- Khi thay đổi mã nguồn, chạy `npm run architecture:check`, `npm run unused:check`, `npm run tokens:check`, `npm run typecheck`, `npm run lint`, `npm run format:check` và `npm run build` trước bàn giao. Chỉ format những file đã sửa.
- Với thay đổi chỉ gồm tài liệu: kiểm tra link/path/lệnh được mô tả và format các file đã sửa; không cần chạy lại build/API/E2E.
- Thay đổi token: thêm `npm run test:tokens`. Thay đổi API/database: `npm run test:api`. Thay đổi UI/route/luồng người dùng: `npm run test:e2e` sau build; kiểm tra trực quan các trạng thái giao diện liên quan.
- Không giảm kiểm tra, sửa test để che lỗi hoặc báo đạt khi chưa chạy. Nêu rõ bước bị chặn và nguyên nhân nếu môi trường thiếu điều kiện.
- Bàn giao: chức năng/path đã sửa, điểm tích hợp ngoài feature, lệnh kiểm tra và kết quả, migration/env nếu có, phần chưa triển khai. Không cam kết không có conflict tuyệt đối: registry, migration và lockfile vẫn là điểm phối hợp.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
