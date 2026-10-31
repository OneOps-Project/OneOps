# Xác minh hệ thống OneOps

Tài liệu ghi nhận kết quả kiểm định chất lượng qua các mốc phát triển.

---

## 1. Mốc xác minh toàn diện — 01/11/2026 (Thiết kế lại UX/UI v3 “Aurora Ops”)

Thay toàn bộ lớp giao diện sang ngôn ngữ Aurora: nền sương tĩnh, chrome kính mờ, lưới bento, widget/KPI/vòng tiến độ, hướng dẫn nhanh 4 bước; giữ nguyên nghiệp vụ, API và hợp đồng kiểm thử.

- **Hệ thống thiết kế (`tokens:check` & `test:tokens`):**
  - **233 design tokens** (125 primitive, 49 semantic, 56 component, 3 density) qua 10 tệp dẫn xuất; **5/5 test token đạt**, 7 cặp tương phản ≥4,5:1 trên cả hai theme.
  - Bổ sung lớp Aurora: `glass`, `glass-border`, `mist-warm/violet/cyan`, `aurora-from/via/to`, `prism-*`, `radius-card/widget`, `shadow-glass`, `blur-glass`, `bento-gap`; utility `bg-glass`, `border-glass-border`, `rounded-card`, `shadow-glass`, `backdrop-blur-glass`.
- **Ranh giới phân hệ & Cấu trúc (`architecture:check`):**
  - 4 nhóm chính, 39 thư mục đối xứng FE/BE, **31 implementation dữ liệu** (9 Record APIs, 22 Resource APIs), **53 owned Prisma models**.
- **Phân tích mã nguồn mồ côi (`unused:check`):** **741 source files** truy vết được từ application entrypoints; không còn CSS/route chết sau khi thay lớp giao diện.
- **Kiểm tra tĩnh:** `typecheck` 0 lỗi, `lint` 0 lỗi, `format:check` đạt trên toàn bộ tệp đã sửa.
- **Kiểm thử E2E (`test:e2e`):** **17/17 test đạt** trên Chrome thật với API và database `_test` (`TEST_DATABASE_URL` trỏ Postgres cục bộ):
  - 20 route chức năng render `main h1`, đúng **một** `aria-current="page"` trong nav “Phân hệ”, route cũ trả 404.
  - `tests/onboarding.spec.ts`: tour 4 bước mở từ header và widget, kẹp trong khung nhìn, `← → Esc`, ghi nhớ `oneops.onboarding.v1`, không tự bật lại.
  - `tests/token-studio.spec.ts` đọc số token từ JSON xuất bản (233) thay vì hằng số cũ.
  - Không tràn ngang ở 1440/768/390 và làm mới toàn bộ ảnh: `workspace-desktop/mobile`, `tasks-1440/768/390`, `tasks-kanban`, `design-tokens-desktop/mobile`, `tailwind-library-light/dark/mobile`, `onboarding-tour`, `auth-desktop`.
- **Kiểm tra trực quan (finish gate):** rail + panel kính, hero aurora, lưới bento 4+8 / 5+7 / 12, widget lộ trình dàn 3 cột, thẻ hướng dẫn nền đặc đọc rõ trên spotlight, vòng tiến độ sạch (đổi `.ring` → `.progress-ring` vì trùng utility `ring` của Tailwind), bố cục đăng nhập hai cột với trạng thái lỗi.

---

## 2. Mốc xác minh toàn diện — 31/10/2026 (Thiết kế lại UX/UI v1.2 “quiet operations console”)

Thay toàn bộ lớp giao diện: điều hướng ba cấp, thứ tự trang thống nhất, token v1.2.0, primitive và các màn trọng yếu; không thay đổi nghiệp vụ hay hợp đồng API.

- **Hệ thống thiết kế (`tokens:check` & `test:tokens`):**
  - **196 semantic design tokens** qua 10 tệp dẫn xuất; 5/5 test token đạt, 7 cặp tương phản ≥4,5:1 trên cả hai theme.
  - `foreground-subtle` chỉnh về `#5f7183` (5,03:1 trên `surface`, 4,68:1 trên `canvas`) để eyebrow, header bảng và chú thích 11–12px đạt AA.
- **Ranh giới phân hệ & Cấu trúc (`architecture:check`):**
  - 4 nhóm chính, 39 thư mục đối xứng FE/BE, 29 implementation dữ liệu (9 Record APIs, 20 Resource APIs), 46 owned Prisma models.
- **Phân tích mã nguồn mồ côi (`unused:check`):**
  - Toàn bộ **698 source files** truy vết được từ application entrypoints; không để lại CSS/route chết sau khi thay lớp giao diện.
- **Kiểm tra tĩnh:** `typecheck` 0 lỗi, `lint` 0 lỗi, `format:check` đạt trên toàn bộ tệp đã sửa.
- **Build:** `npm run build` thành công, **30 route** tĩnh/động của `apps/web` và build `@oneops/api`, `@oneops/database`.
- **Kiểm thử E2E (`test:e2e`):** **15/15 test đạt** trên Chrome thật với API và database `_test`, gồm cả 3 test giao diện:
  - 18 route chức năng render `main h1`, ảnh tải đủ, đúng **một** `aria-current="page"` trong nav “Phân hệ”, 8 route cũ trả 404.
  - Không tràn ngang ở 1440/768/390 và screenshot được tạo lại: `workspace-desktop.png` (1440), `workspace-mobile.png` (390), `tasks-1440/768/390.png`.
  - Luồng tạo nhanh toàn cục, chuyển trạng thái công việc, QA gate và timesheet vẫn đạt sau khi đổi shell.
- **Kiểm tra trực quan (finish gate):** rail 5 mục, panel theo phân hệ, dải trọng tâm tổng quan, toolbar hai nhóm, kanban cùng chiều cao, trạng thái khởi động có nhận diện; light/dark và comfortable/compact giữ nguyên hành vi lưu lựa chọn.

---

## 3. Mốc xác minh toàn diện — 31/10/2026 (Mở rộng toàn diện HR & Tenant Policies)

- **Ranh giới phân hệ & Cấu trúc (`architecture:check`):**
  - **4 nhóm chính, 39 thư mục đối xứng FE/BE**.
  - **29 chức năng dữ liệu hoàn chỉnh** (9 Record APIs, 20 Resource APIs), hoàn thành 100% phân hệ `hr-management` (11/11), 100% `work-management` (12/12) và 5/9 `tenant-system`.
  - **46 owned Prisma models** được liên kết hợp lệ thông qua multi-schema database federation.
  - Các phần chưa triển khai (`crm`, `company-profile`, `automation-hub`) tiếp tục được giữ trống sạch sẽ.
- **Phân tích mã nguồn mồ côi (`unused:check`):**
  - Toàn bộ **698 source files** đều có thể truy vết hợp lệ từ application entrypoints.
- **Hệ thống Design Tokens (`tokens:check` & `test:tokens`):**
  - **187 semantic design tokens** được kiểm định nghiêm ngặt qua 10 tệp dẫn xuất; đảm bảo tỷ lệ tương phản màu sắc và cấu trúc token.
- **Kiểm tra kiểu dữ liệu tĩnh (`typecheck`):**
  - Đạt **0 lỗi** (TypeScript clean) trên toàn bộ monorepo (`@oneops/api`, `@oneops/web`, `@oneops/database`).
- **Quy chuẩn mã nguồn (`lint`):**
  - Đạt **0 lỗi** ESLint trên toàn bộ các workspace.
- **Kiểm thử tích hợp API (`test:api`):**
  - **26/26 test suites đạt 100%**, bao gồm toàn diện:
    1. Xác thực phiên trượt & bảo vệ route khách.
    2. Phân tách CRUD namespace của các resource.
    3. Sơ đồ tổ chức phòng ban phân cấp không xóa cứng.
    4. Chức danh ngạch bậc và chặn bậc không hợp lệ.
    5. Danh bạ hồ sơ nhân sự và tính duy nhất email.
    6. Tài khoản, quyền hạn và chặn xóa người quản trị cuối.
    7. Ma trận phân quyền RBAC và ghi đè cấp tổ chức.
    8. Nhật ký kiểm toán append-only bất biến.
    9. Xử lý trùng mã và xung đột phiên bản version.
    10. Thẩm định schema Zod và chặn ghi đè status trực tiếp.
    11. Checklist công việc và bình luận riêng biệt.
    12. Phân trang, tìm kiếm và lọc dữ liệu.
    13. Kiểm soát cập nhật đồng thời (Optimistic Concurrency).
    14. Tổng hợp dữ liệu bảng điều khiển Workspace Today.
    15. Tính bền vững dữ liệu sau khởi động lại NestJS.
    16. Sự kiện phát sinh thông báo đa kênh.
    17. Luồng thông báo thời gian thực Server-Sent Events (SSE).
    18. Phiên làm việc, trượt hạn, đổi mật khẩu và thu hồi.
    19. Máy trạng thái công việc hữu hạn (TR-02..TR-09).
    20. Đề xuất hoãn/hủy/gia hạn việc chờ quản lý khác duyệt.
    21. Mốc tiến độ và Cổng QA Gate chặn hoàn tất việc chưa đạt.
    22. Bảng chấm công tuần 15 phút và duyệt theo ngưỡng.
    23. Điểm danh hàng ngày, bảng quân số hiện diện và giải trình.
    24. Mẫu ca kíp, mẫu tuần hoàn và phân ca nhân sự.
    25. Kỳ chốt công, tổng hợp dòng công và khóa sổ bất biến.
    26. Đơn xin nghỉ phép, duyệt phép và tính toán công suất dự án.
- **Trích xuất Sơ đồ Tri thức Kiến trúc (Graphify Engine):**
  - Trích xuất thành công mạng lưới **4.978 nodes**, **13.126 edges** và **169 communities**.
  - Sinh sơ đồ tương tác trực quan `graphify-out/OneOps-callflow.html` (17 sections, 16 Mermaid call-flow diagrams, 15 call tables).
  - Xuất 179 bài viết wiki chi tiết tại `graphify-out/wiki/`.

---

## 4. Các mốc xác minh trước đó

### Mốc 31/10/2026 (Sáng) — Hoàn thiện Core Work & Access Control

- 20 implementation dữ liệu, 30 models, 540 source files.
- Bổ sung xác thực `tenant-auth`, tài khoản `accounts`, quyền `roles-permissions`, kiểm toán `checklog`, thông báo SSE `notifications`, `milestones-qa`, `timesheets`.

### Mốc 30/10/2026 — Xóa code company-profile và bỏ audit-backups

- Còn 39 chức năng cấu trúc và 8 implementation dữ liệu.
- `audit-backups` đã bị gỡ. Menu, form, API `/teams`, route `/tenant-system/company-profile` đã gỡ sạch sẽ.

### Mốc 29/10/2026 — Phân bổ theo file cấu trúc ban đầu

- Chuyển đổi mã nguồn sang 4 main groups và 39 thư mục chức năng con đối xứng FE/BE.
