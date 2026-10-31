# Hợp đồng UX/UI — Phase 0

Mục tiêu là một sản phẩm vận hành hiện đại, rõ ràng và nhanh, không phải bản trình diễn trang trí. Contract này áp dụng cùng lúc với `docs/IMPLEMENTATION-CONTRACTS.md` và `AGENTS.md`; không thay thế yêu cầu nghiệp vụ hoặc token hiện có.

## 1. Nguyên tắc thiết kế

1. **Rõ việc trước, đẹp sau:** mỗi màn hình có một mục tiêu chính, một hành động chính và đường đọc rõ ràng.
2. **Một ngôn ngữ sản phẩm:** dùng `AppShell`, token ngữ nghĩa, typography, spacing, radius, shadow, layer và control sizing hiện có.
3. **Mật độ có chủ đích:** comfortable cho không gian rộng, compact cho bảng/kanban nhiều dữ liệu; không trộn hai mật độ trong cùng vùng.
4. **Hiện đại bằng hệ thống:** phân cấp tốt, khoảng trắng hợp lý, toolbar gọn, progressive disclosure, trạng thái rõ và chuyển động tiết chế—không dùng gradient/glass/neon/illustration trang trí để che cấu trúc yếu.
5. **Không chỉ dùng màu:** deadline, trạng thái, priority và lỗi luôn có nhãn/icon; đảm bảo nhận biết khi không phân biệt màu.
6. **Không mất dữ liệu người dùng:** lỗi submit giữ nguyên form; submit lặp bị chặn; thông báo thành công chỉ xuất hiện sau khi server xác nhận.

## 2. Ranh giới token

- Nguồn duy nhất: `tokens/source.json`. Generated CSS/JSON/Tailwind mapping không sửa tay.
- Chỉ dùng utility ngữ nghĩa đã có như `bg-canvas`, `bg-surface`, `bg-elevated`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `rounded-control`, `rounded-panel`.
- Không hex/RGB, không palette riêng, không `!important`, không z-index tùy ý, không selector `body`, `:root`, `button`, `.btn` từ feature.
- Component nằm trong `components/primitives` của feature sở hữu; không import primitive từ feature khác hoặc `core/ui/primitives`.
- Nếu thiếu token dùng chung: ghi đề xuất tại handoff và tiếp tục bằng token gần nhất phù hợp; thay đổi token là package hệ thống riêng có test token, không gộp vào feature.
- Không tạo theme/provider toàn cục trong feature. Light/dark và comfortable/compact do root hiện có quản lý.

## 3. Khung trang chuẩn

Mỗi màn hình danh sách/không gian làm việc dùng thứ tự:

1. **Page header:** breadcrumb khi phân cấp; tiêu đề; mô tả ngắn chỉ khi thêm ngữ cảnh; primary action; secondary actions trong menu.
2. **Context bar:** scope hiện tại (Department/Team/Project/Sprint), trạng thái kết nối/realtime nếu cần.
3. **Toolbar:** tìm kiếm, filter đã chọn, sắp xếp, view switch. Filter nâng cao nằm trong popover/sheet, không chiếm vĩnh viễn màn hình.
4. **Nội dung:** table cho dữ liệu so sánh; list/card cho item cần quét nhanh; Kanban cho luồng trạng thái. Không biến mọi khối thành card.
5. **Supporting detail:** panel/sheet/dialog đúng ngữ cảnh, giữ URL/focus/back phù hợp.
6. **Empty/error/loading:** chiếm đúng vùng nội dung, không làm nhảy header/toolbar.

Chi tiết entity dùng tab có thứ tự ổn định, phần tóm tắt trên cùng và hành động nhạy cảm tách khỏi hành động thường. Form dài chia nhóm bằng `details`/section có heading thật, không dùng quá nhiều khung viền.

## 4. Component và pattern

- Button: một primary rõ trong mỗi vùng; destructive dùng style danger và xác nhận theo mức rủi ro.
- Dialog chỉ cho tác vụ ngắn, tập trung; form dài dùng trang/sheet. Escape/focus trap/return focus theo Radix hiện có.
- Table: header dính khi cuộn dài; cột quan trọng không bị cắt; action không làm mất dữ liệu; mobile chuyển sang list có label hoặc bảng cuộn ngang có chỉ báo.
- Filter: hiển thị filter đang áp dụng dưới dạng chip có thể xóa; nút “Xóa tất cả”; kết quả đếm lại sau filter.
- Badge trạng thái: semantic variant + text; không mượn badge cảnh báo cho trang trí.
- Form field: label luôn hiển thị, hint/error liên kết bằng ID, required rõ ràng, validation tại field và summary khi submit.
- Toast chỉ xác nhận ngắn; lỗi cần hành động dùng alert/inline error bền hơn toast.
- Menu tài khoản/theme giữ ở shell; feature không tự thêm công tắc sáng/tối.

## 5. Trạng thái bắt buộc

Mỗi màn hình/package phải định nghĩa và kiểm tra:

| Trạng thái         | Yêu cầu                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Initial loading    | Skeleton đúng cấu trúc, không spinner toàn trang nếu chỉ tải một vùng                      |
| Refetch            | Giữ nội dung cũ, chỉ báo đang cập nhật; tránh nháy layout                                  |
| Empty              | Giải thích vì sao trống và hành động tiếp theo; không chỉ “Không có dữ liệu”               |
| Filtered empty     | Nêu filter đang bật và cách xóa                                                            |
| Error              | Thông điệp theo `code`, hướng khắc phục, retry nếu an toàn; không lộ stack/secret          |
| Forbidden          | Giải thích thiếu quyền/scope, không giả vờ 404 nếu UX cần minh bạch; server vẫn quyết định |
| Offline/reconnect  | Hiển thị trạng thái kết nối, dữ liệu có thể đã cũ, tự phục hồi/replay                      |
| Stale/conflict     | Báo version conflict, giữ dữ liệu nhập và cho tải lại/đối chiếu                            |
| Success            | Xác nhận sau commit; cập nhật UI bằng dữ liệu server trả về                                |
| Long content       | Không tràn ngang; text dài wrap/line-clamp có cách xem đầy đủ                              |
| Disabled/read-only | Nêu lý do ở tooltip/help text gần control; không chỉ giảm opacity                          |

## 6. Responsive

- Desktop ≥1024: ưu tiên bố cục nhiều vùng, table/kanban đầy đủ.
- Tablet 768–1023: giảm cột phụ, panel chi tiết có thể thành overlay.
- Mobile <768: một cột; toolbar gọn; filter trong sheet; primary action dễ chạm; Kanban cuộn ngang có snap hoặc chuyển tab cột, không mất thao tác chính.
- Không ẩn chức năng nghiệp vụ chỉ vì màn hình nhỏ. Không tạo bản mobile là dữ liệu giả hoặc read-only ngoài yêu cầu.
- Kiểm tra zoom 200%, text resize và bàn phím ảo không che control.

## 7. Accessibility

Mục tiêu WCAG 2.2 AA cho các luồng được giao; chỉ tuyên bố “đạt” khi có kiểm tra tương ứng.

- HTML ngữ nghĩa, heading theo cấp, landmark, label/accessible name.
- Focus visible bằng token focus; không xóa outline nếu chưa có thay thế tương đương.
- Toàn bộ thao tác chính dùng được bằng keyboard; dialog/sheet giữ focus đúng.
- Target size đủ lớn theo control token; không đặt hai action nguy hiểm sát nhau.
- Contrast kiểm tra trên bốn profile; trạng thái có text/icon, không chỉ màu.
- Live region cho kết quả async quan trọng; tránh thông báo lặp gây nhiễu.
- Tôn trọng `prefers-reduced-motion`; animation không phải phương tiện duy nhất truyền đạt trạng thái.

## 8. Motion

- Chỉ dùng duration/easing token hiện có.
- Motion cho enter/exit overlay, drag/drop feedback, save/sync và realtime update; không animate bảng lớn hoặc layout liên tục.
- Không gây layout shift, không kéo dài thao tác, không tự chạy vô hạn.
- Realtime update phải tránh giật: giữ vị trí cuộn/focus, highlight thay đổi có thời hạn, không mở lại dialog đã đóng.

## 9. Data visualization

- Chart chỉ dùng khi giúp so sánh/xu hướng; số liệu chính vẫn có text.
- Trục, đơn vị, legend, ngày và nguồn dữ liệu rõ; empty/insufficient data được nói rõ.
- Màu series lấy từ token semantic/status phù hợp; khác biệt bằng shape/label/pattern khi cần.
- Có bảng hoặc text summary tương đương cho screen reader; tooltip không phải nơi duy nhất chứa dữ liệu.
- Burndown hiển thị Ideal vs Actual; Velocity nêu Sprint được tính; không dùng % nhập tay.

## 10. Ownership và gate theo package

| Vai trò                             | Trách nhiệm                                                                              | Không được làm                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- |
| UX Researcher + Persona Walkthrough | Inventory top task, friction, journey Employee/Manager/admin; kiểm tra lại sau implement | Tự đổi business rule hoặc bỏ qua scope             |
| UX Architect                        | IA, hierarchy, responsive flow, state matrix, keyboard/focus                             | Tạo theme/component toàn cục                       |
| UI Designer                         | High-fidelity key screens, component spec trong token hiện có                            | Thêm hex, token mới, style toàn cục                |
| Brand Guardian                      | Nhận diện, typography, spacing, nhất quán cross-feature                                  | Trang trí lấn át hierarchy                         |
| Inclusive Visuals Specialist        | Contrast, target, non-color cue, text resize, icon/imagery                               | Chỉ dựa vào màu hoặc hình                          |
| Whimsy Injector                     | Gợi ý micro-feedback có ích, tiết chế                                                    | Animation/illustration gây chậm hoặc phân tâm      |
| Frontend Developer                  | Implement đúng contract, primitive nội bộ feature, state/async                           | Import UI feature khác hoặc thêm dependency UI mới |
| Realtime Engineer                   | Trạng thái kết nối/replay/optimistic update                                              | Tự tạo nguồn dữ liệu thứ hai                       |
| UI Finish Gate Reviewer             | So screenshot, state, keyboard, mobile, 4 profile; quyết định pass/fail                  | Chấp nhận happy path thiếu state                   |

Thứ tự gate:

1. Flow + state + permission matrix được duyệt.
2. Key-screen visual được duyệt trên token hiện có.
3. Implementation chạy với dữ liệu thật/seed test hợp lệ.
4. Persona walkthrough + screenshot matrix.
5. UI Finish Gate pass; sau đó mới đóng package.

## 11. Bằng chứng bàn giao UI

Mỗi UI package cung cấp:

- Danh sách route/screen và role được kiểm tra.
- Screenshot light/comfortable, light/compact, dark/comfortable, dark/compact ở desktop; tối thiểu mobile cho luồng chính.
- Screenshot loading, empty, filtered empty, error, forbidden, conflict/reconnect khi có.
- Kết quả keyboard/focus, text resize 200%, reduced motion.
- Đường dẫn file thay đổi và primitive được sở hữu.
- Finding còn mở hoặc blocker môi trường; không tuyên bố đạt khi chưa chạy.

## 12. Kiến trúc đã chốt trong bản thiết kế lại v1.2

Các quyết định dưới đây là kết quả của vòng thiết kế lại toàn bộ UX/UI; chúng thay thế mô tả cũ khi có khác biệt và là mốc so sánh cho lần thay đổi sau.

- **Điều hướng ba cấp:** rail 68px (cấp 1: Tổng quan, Công việc, Nhân sự, Hệ thống, Thư viện) → panel 268px (cấp 2: chức năng của phân hệ, nhãn eyebrow và nhóm `Bộ lọc` theo trạng thái) → nội dung. Không đưa toàn bộ 26 chức năng vào rail.
- **Một điểm “đang ở đây”:** `aria-current="page"` chỉ đặt trên mục rail; liên kết trong panel dùng `aria-current="true"` để không tạo nhiều con trỏ trang.
- **Thứ tự nội dung cố định:** `page-header` → `metric-strip` hoặc dải trọng tâm → `toolbar` → `surface`/bảng → `page-footnote`. Toolbar chia hai nhóm: lọc bên trái, điều khiển hiển thị + đếm kết quả bên phải.
- **Tổng quan theo việc phải làm:** dải trọng tâm trả lời “cần xử lý trước” (số quá hạn) kèm 4 tín hiệu phụ; danh sách “Việc cần quan tâm” và “Ghim của tôi”. Không dùng lưới 6 thẻ KPI ngang hàng và không hiển thị “—” khi chưa có số liệu — dùng skeleton.
- **Trạng thái khởi động:** màn hình chờ có nhận diện, nhãn và thanh tiến trình tiết chế thay cho khung trắng; tôn trọng `prefers-reduced-motion`.
- **Tương phản nhãn phụ:** `foreground-subtle` giữ ≥4,5:1 trên cả `surface` và `canvas`, đủ cho eyebrow, header bảng và chú thích 11–12px.
- **Vùng chạm:** liên kết panel ≥36px, mục rail ≥54px, nút icon 40px; focus ring dùng token `--ring` cho mọi phần tử tương tác.
- **Kanban:** các cột cùng chiều cao, vùng thả trống giãn hết cột; khi số cột vượt vùng nhìn, bảng cuộn ngang trong khung nội dung và không làm tràn trang.
