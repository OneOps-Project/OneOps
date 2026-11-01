# Quản lý tài khoản

Module tại `tenant-system/access-control/accounts`, trang `/tenant-system/accounts`, triển khai theo mục 1 và phần Group được mô tả tại mục 2 của tài liệu BA bổ sung.

## Sử dụng lần đầu

1. Cấu hình PostgreSQL trong `apps/api/.env`; chạy `npm run db:migrate`.
2. Chạy `npm run accounts:bootstrap` tại root trong terminal tương tác. Nhập mã nhân viên, họ tên, email, username và mật khẩu. Mật khẩu được che khi nhập, không có tài khoản/mật khẩu mặc định.
3. Chạy `npm run dev`, đăng nhập bằng tài khoản vừa tạo và mở menu **Tài khoản**.
4. Tạo hồ sơ nhân viên tối thiểu bằng nút **Tạo hồ sơ nhân viên**, sau đó **Tạo tài khoản** và chọn hồ sơ có sẵn.

Bootstrap chỉ chạy khi chưa có tài khoản. Hồ sơ nhân viên lưu ở HR; không tạo hồ sơ giả khi cấp tài khoản. Mỗi nhân viên chỉ liên kết một tài khoản; tên đăng nhập và email được chuẩn hóa chữ thường và kiểm tra duy nhất.

## Chức năng

- Danh sách có tìm theo tên/mã nhân viên/username/email, lọc vai trò/trạng thái và phân trang.
- Tạo, sửa username/email; liên kết hồ sơ nhân viên được giữ nguyên khi sửa.
- Hai role cố định: Nhân viên và Quản lý. Quản lý không tự có quyền quản trị tài khoản.
- Quản trị cấp cao được cấp/thu hồi quyền quản trị tài khoản cho tài khoản role Quản lý. Người được ủy quyền không cấp tiếp quyền hoặc sửa/đặt lại mật khẩu tài khoản Quản trị cấp cao.
- Khóa/mở khóa có xác nhận và lý do. Không tự khóa tài khoản đang sử dụng; không khóa hoặc hạ role Quản trị cấp cao bằng luồng thông thường.
- Đặt lại mật khẩu; băm bằng scrypt với salt ngẫu nhiên, không hiển thị mật khẩu cũ hoặc ghi secret vào nhật ký. Chính sách triển khai: tối thiểu 12 ký tự, có chữ và số.
- Lịch sử tài khoản/Group phân trang, đọc từ checklog tập trung. Ghi dữ liệu và nhật ký trong cùng transaction.
- Group có tên, directory duy nhất, người sở hữu, giới thiệu và thành viên; chủ sở hữu luôn thuộc nhóm. Có tạo/sửa/thêm/bớt thành viên và lịch sử. Quyền quản lý Group tạm dùng quyền quản trị tài khoản; chưa có xóa Group vì BA chưa chốt vòng đời và tham chiếu.

## Phiên và bảo vệ API

Phiên ngẫu nhiên được lưu dưới dạng hash trong database, cookie HttpOnly/SameSite=Strict, Secure ở production, thời hạn 8 giờ. Proxy FE chuyển tiếp cookie và Set-Cookie. Đăng xuất thu hồi phiên server. Khóa tài khoản, đổi role, đổi quyền và đặt lại mật khẩu thu hồi phiên cũ; phiên còn được ràng buộc version tài khoản để chặn cập nhật đồng thời với đăng nhập.

Các API nghiệp vụ hiện yêu cầu đăng nhập. API tài khoản/hồ sơ tạo từ luồng này yêu cầu thêm quyền quản trị tài khoản. Đăng nhập sai được giới hạn theo username và IP. Thiết lập `WEB_ORIGIN` ở API cho địa chỉ FE triển khai; mặc định `http://localhost:3002`. Nếu đổi port FE, cập nhật biến này.

Phân quyền phạm vi dữ liệu của các module công việc cũ chưa được mở rộng thành RBAC đầy đủ trong lần này. Quy tắc truy cập riêng của module tài khoản được thực thi tại backend, bao gồm truy cập trực tiếp API.

## Khóa tài khoản và công việc cần giao lại

- Tìm task mở theo `assigneeAccountId` hoặc `assignee` khớp ID tài khoản, ID/mã nhân viên, username. Không ghép theo họ tên để tránh nhầm người trùng tên.
- Khi đổi username, task đang tham chiếu username cũ được gắn ID tài khoản ổn định trong cùng transaction.
- Gắn cờ `reassignmentRequired`, lý do, thời điểm và người thao tác; giữ nguyên assignee, deadline và lịch sử đã có. Không tác động task Hoàn thành/Đã hủy.
- Gửi thông báo lưu database tới `managerAccountId` được chỉ định trên task. Task cũ chưa có quản lý được gửi cho người quản trị tài khoản để xem xét. Đây là cơ chế chuyển tiếp cho tới khi có Department/Team.
- Thông báo hiển thị trong trang tài khoản của người nhận; danh sách task hỗ trợ `/work-management/tasks?reassignment=1` và nhãn **Cần giao lại**.
- Mở khóa không tự xóa cờ hoặc hoàn tác phân công. Quy trình giao lại hoàn chỉnh thuộc module công việc.

Khi Department/Team được triển khai, bổ sung kiểm tra người thay thế trước khi thu hồi role Quản lý và xác định quản lý nhận bàn giao qua public services tại composition. Hiện chưa có dữ liệu tổ chức để kiểm tra các quan hệ này.

## Điểm tích hợp

| Module             | Trách nhiệm đã triển khai                                        |
| ------------------ | ---------------------------------------------------------------- |
| Accounts           | Tài khoản, thông tin xác thực được băm, Group và thành viên      |
| Tenant-auth        | Đăng nhập/đăng xuất, kiểm tra phiên, giới hạn thử đăng nhập      |
| Roles-permissions  | Quyền quản trị tài khoản và Quản trị cấp cao tối thiểu           |
| Employee-directory | Lưu và tạo hồ sơ nhân viên tối thiểu: mã, tên, email, trạng thái |
| Checklog           | Lưu và đọc nhật ký tài khoản/Group; không có API sửa/xóa         |
| Tasks              | Đánh dấu task cần giao lại qua public service                    |
| Notifications      | Lưu thông báo bàn giao, đọc và đánh dấu đã đọc theo người nhận   |

Adapters nằm trong `tenant-system.accounts.module.ts`. Các leaf feature không import nội bộ nhau và repository chỉ dùng các model sở hữu. Không có khóa ngoại chéo module; các quan hệ nội bộ Accounts dùng khóa ngoại.

## API chính

| API                                                                  | Mục đích                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /api/v1/auth/login`, `POST /auth/logout`, `GET /auth/me`       | Phiên đăng nhập; các đường dẫn rút gọn trong bảng đều có prefix `/api/v1` |
| `GET/POST /accounts`, `GET/PATCH /accounts/:id`                      | Danh sách, tạo, xem và sửa tài khoản                                      |
| `POST /accounts/:id/status`                                          | Khóa/mở khóa, có version và lý do                                         |
| `POST /accounts/:id/role`                                            | Thay đổi role, có version                                                 |
| `POST /accounts/:id/password`                                        | Đặt lại mật khẩu, có version                                              |
| `GET /accounts/:id/history`                                          | Lịch sử tài khoản                                                         |
| `GET /accounts/employees`, `POST /employees`                         | Chọn hồ sơ chưa có tài khoản hoặc tạo hồ sơ HR tối thiểu                  |
| `GET/POST /accounts/groups`, `PATCH /accounts/groups/:id`            | Quản lý Group                                                             |
| `GET /accounts/groups/:id/history`                                   | Lịch sử Group                                                             |
| `GET /account-permissions/:id`, `POST /account-permissions`          | Xem/cấp/thu hồi quyền quản trị tài khoản                                  |
| `GET /account-notifications`, `POST /account-notifications/:id/read` | Thông báo của người đăng nhập                                             |

## Kiểm tra

`npm run test:accounts`: validation và băm mật khẩu. `npm run test:api`: tích hợp tài khoản và hồi quy công việc. `npm run test:e2e`: luồng giao diện. Các kiểm thử tích hợp chỉ ghi/xóa dữ liệu trong database riêng kết thúc `_test`; fixtures tự tạo quản trị kiểm thử và đăng nhập bằng cookie thật.

Registry hỗ trợ `kind: resource` cho Accounts và `kind: service` cho các phần chỉ có BE. Checklog hiện là resource có FE/BE; xem [CHECKLOG.md](CHECKLOG.md). `models`/`tables` ghi rõ các model/bảng được sở hữu; không tạo FE hay controller giả để đủ registry.
