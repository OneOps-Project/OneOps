# Nhật ký hệ thống

Trang `/tenant-system/checklog` tra cứu nhật ký tập trung. FE và BE nằm trong `features/tenant-system/checklog`; schema dùng bảng `tenant_audit.entries` hiện có. Lịch sử từng tài khoản/Group tiếp tục đọc cùng bảng qua public Checklog service; không có kho lịch sử thứ hai.

## Chức năng

- Ghi người thao tác, thời điểm server, module, hành động, loại/ID/tên đối tượng, kết quả SUCCESS/FAILURE/DENIED và giá trị trước/sau.
- Tra cứu kết hợp từ khóa, module, người thực hiện (username hoặc ID), hành động, loại/ID đối tượng, kết quả và khoảng ngày.
- Phân trang 20 sự kiện; API hỗ trợ pageSize tối đa 100. Sắp xếp mới nhất theo thời điểm và ID; các thống kê phản ánh bộ lọc hiện hành.
- Chi tiết sự kiện trình bày thông tin truy vết và giá trị trước/sau. Snapshot không tải kèm danh sách, chỉ lấy khi mở chi tiết.
- Không có chức năng hoặc endpoint thông thường để tạo thủ công, sửa hay xóa nhật ký. Chỉ server-side service được ghi sự kiện.

Khoảng ngày được tính theo Asia/Ho_Chi_Minh: từ đầu ngày bắt đầu đến hết ngày kết thúc. Không cho khoảng ngày đảo ngược; ID đối tượng phải là UUID.

## Quyền truy cập

Mặc định chỉ **Quản trị cấp cao** xem danh sách, bộ lọc và chi tiết nhật ký tập trung. Người có quyền quản trị tài khoản vẫn xem lịch sử đối tượng trong Accounts theo quyền Accounts, nhưng quyền đó không tự cấp quyền đọc nhật ký toàn hệ thống.

Checklog chỉ phụ thuộc port `ChecklogAccess`. Adapter `ChecklogAuthorization` tại `tenant-system.accounts.module.ts` nối sang public TenantAuthService. Khi module phân quyền có chính sách đọc nhật ký riêng, đổi adapter này; không cho FE tự quyết định quyền và không import repository của module khác.

GET `/api/v1/checklog`, `/api/v1/checklog/filters`, `/api/v1/checklog/:id` đều có kiểm tra phiên và quyền trước khi truy vấn. Truy cập trực tiếp API cũng bị kiểm soát.

## Che dữ liệu nhạy cảm

- Khi ghi: kiểm tra payload JSON và che đệ quy các khóa mật khẩu, hash mật khẩu, token, cookie, authorization, secret, API/private key; số điện thoại, giấy tờ định danh, tài khoản ngân hàng, thuế/bảo hiểm, ngày sinh, địa chỉ và lương/thu nhập.
- Cờ boolean như `passwordChanged` được giữ để biết thao tác đã xảy ra; không giữ giá trị mật khẩu.
- Email được che phần định danh; các chuỗi email và Bearer token rõ ràng trong văn bản cũng được che.
- Khi đọc: tiếp tục che dữ liệu để bảo vệ sự kiện cũ đã ghi trước khi bổ sung cơ chế này. Không viết lại snapshot gốc của lịch sử cũ.
- Quy tắc dựa trên tên trường và các mẫu nhận diện đã khai báo, không thay thế việc chọn trường an toàn ở module phát sự kiện. Không đưa nội dung tệp, request body nguyên bản hoặc secret vào nhật ký.

Giá trị đã che trước/sau có thể giống nhau; giao diện không suy ra dữ liệu gốc từ các giá trị này.

## Tích hợp từ module nghiệp vụ

Leaf feature không import chéo Checklog. Module nghiệp vụ định nghĩa port ghi nhật ký của mình, composition adapter gọi public ChecklogService. Theo mẫu AccountsAudit → AuditAdapter hiện có.

```ts
await checklog.record(
  {
    module: "hr-management/employees/employee-directory",
    actorId: actor.id,
    actorName: actor.username,
    action: "employee.updated",
    entityType: "employee",
    entityId: employee.id,
    entityName: employee.name,
    result: "SUCCESS",
    before: previousSnapshot,
    after: currentSnapshot,
  },
  transaction,
);
```

Actor lấy từ phiên đã xác thực; không tin actor do client gửi. Module dùng đường dẫn sở hữu trong cấu trúc dự án; action dùng dạng `employee.updated`, `account.status-changed`. Snapshot là object JSON gồm các trường cần truy vết, không chứa dữ liệu thừa.

Với thay đổi thành công, truyền cùng transaction nghiệp vụ để ghi dữ liệu và nhật ký cùng commit/rollback. Sự kiện thất bại hoặc bị từ chối phải được module phát sau khi transaction thất bại đã rollback, dùng một lần ghi riêng. Kết quả phải phản ánh thao tác thực tế; Checklog không tự suy diễn kết quả từ HTTP.

Hiện Accounts/Group đã phát sự kiện thật. Các module khác chỉ có dữ liệu trong trang tập trung sau khi nối producer tương ứng; không tự tạo nhật ký giả để lấp danh sách. Không có endpoint công khai để client gửi lịch sử tùy ý.

## Migration và kiểm tra

Migration `20261030090000_central_checklog` thêm module/kết quả/tên đối tượng và index; gán metadata tương thích cho sự kiện tài khoản cũ. Không xóa sự kiện hay dữ liệu nghiệp vụ.

```sh
npm run db:migrate
npm run test:checklog
npm run test:api
npm run build
npm run test:e2e
```

Các test tích hợp dùng database riêng có tên kết thúc `_test`; kiểm tra lọc, phân trang, ranh giới ngày Việt Nam, quyền, redaction mới/cũ và không có endpoint sửa/xóa. Test UI kiểm tra điều hướng, lọc, chi tiết, dữ liệu đã che, keyboard/focus và dark/compact trên mobile.
