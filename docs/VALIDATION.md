# Xác minh Checklog tập trung — 30/10/2026

- 31/31 kiểm thử API đạt: 9 tình huống Checklog và 22 tình huống tài khoản/công việc hiện có.
- 13/13 kiểm thử trình duyệt đạt: thêm 3 luồng Checklog, giữ 10 luồng hiện hữu. Có kiểm tra focus khi đóng dialog, dark/compact và mobile.
- 6/6 kiểm thử riêng Checklog đạt về redaction đệ quy, dữ liệu cũ, cờ audit, payload và bộ lọc.
- Build, typecheck, lint, format, token check và kiểm tra ranh giới module đạt; 348 file nguồn reachable.
- Cùng bảng tenant_audit.entries phục vụ tra cứu tập trung và lịch sử Accounts/Group. Không có endpoint sửa/xóa/tạo thủ công.
- Migration bổ sung metadata/index và bảo toàn sự kiện cũ. Dữ liệu mới được che trước khi lưu; sự kiện cũ được che khi trả về API.
- Mặc định quyền xem toàn hệ thống dành cho Quản trị cấp cao; quản trị tài khoản không tự có quyền này. Xem [CHECKLOG.md](CHECKLOG.md).

## Các lần xác minh trước

### Module tài khoản — 30/10/2026

- 4 module chính, 39 nhánh cấu trúc; registry có 14 implementation: 9 có FE/BE và 5 chỉ BE tối thiểu.
- 329 file nguồn reachable; architecture check, unused check, token check, lint, format, typecheck và build đạt.
- 22/22 kiểm thử API đạt: quyền quản trị, chống nâng quyền, dữ liệu liên kết, uniqueness, optimistic version, reset mật khẩu, thu hồi phiên, bàn giao task, Group, bootstrap, nguồn truy cập, username và hồi quy công việc.
- 4/4 kiểm thử validation và băm mật khẩu đạt. 10/10 kiểm thử trình duyệt đạt, gồm 3 luồng tài khoản mới và 7 luồng hiện hữu.
- Hai migration mới chỉ tạo schema/bảng phụ thuộc và thêm phiên bản phiên; không xóa dữ liệu nghiệp vụ cũ.
- Lần đầu cần `npm run accounts:bootstrap` để nhập thông tin quản trị thực. Không có tài khoản/mật khẩu mặc định. Xem [ACCOUNTS.md](ACCOUNTS.md).

## Lịch sử xác minh trước khi có module tài khoản

### Sau phân bổ theo file cấu trúc — 29/10/2026

- 4 main groups và 39 thư mục chức năng con đối xứng FE/BE, theo `Cau Truc Thu Muc (1).md`.
- 8 implementation dữ liệu hiện hữu được di chuyển; không tạo API/trang nghiệp vụ mới cho phần còn trống.
- Prisma validate/generate đọc model gốc qua database package; lần chuyển thư mục trước đó có migrate diff trả **No difference detected**. Cập nhật 30/10 đã gỡ WorkTeam khỏi source/client, không áp dụng migration DROP hoặc xóa bảng cũ.
- Boundary check và unused check đạt: 269 file nguồn reachable; entrypoint database package được đưa vào import graph. Folder trống được kiểm tra riêng bằng feature-structure.json.
- 8/8 API integration đạt sau khi đổi tên class, chuyển DTO/client/database config: CRUD isolation, version conflict, strict validation, checklist/comments, pagination, concurrency, workspace metrics qua nhiều trang và restart persistence.
- Build đã biên dịch được routing nhóm admin, 4 main Nest modules và các feature đã có. URL cũ chuyển tiếp sang route mới; API URL giữ tương thích.

Browser suites kiểm tra catalog/token studio, theme/density, mobile, asset SVG qua Next bundle, điều hướng và route chưa triển khai 404; Kanban tại đường dẫn mới, checklist/comment đã tách, sửa/xuất/xóa và đổi phân hệ trong dialog tạo mới. Kết quả: **7/7 browser tests đạt**. Build, typecheck toàn workspace, lint, format và **5/5 test token** đều đạt.

Chi tiết vị trí mới và phần thiếu: `FOLDER-MAPPING.md`. Những phần authentication, RBAC, event bus, realtime, attendance/leaves và CRM vẫn chưa được triển khai.

## Xóa code company-profile và bỏ audit-backups — 30/10/2026

Còn 39 chức năng cấu trúc và 8 implementation dữ liệu. company-profile và departments-teams không có file implementation ở cả FE/BE; departments-teams được xác định là quản lý phòng ban. audit-backups đã bị gỡ và không được structure:prepare tạo lại. Menu, form, API /teams, route /tenant-system/company-profile và redirect /teams đã gỡ. Test API xác nhận /teams trả 404; browser test kiểm tra cả /teams và /tenant-system/company-profile trả 404. Không sửa lịch sử migration hoặc xóa dữ liệu PostgreSQL cũ.
