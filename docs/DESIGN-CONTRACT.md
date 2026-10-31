# OneOps UI/UX — Hợp đồng thiết kế v3 “Aurora Ops”

Tài liệu chốt hướng thiết kế lại toàn bộ giao diện OneOps. Mọi thay đổi giao diện đọc tài liệu này trước khi sửa `tokens/source.json`, `globals.css` hoặc primitive của chức năng.

v3 thay v2: cho phép **widgets grid + bento + neon mists + soft gradient + glassmorphism + onboarding** (yêu cầu sản phẩm), nhưng chỉ trong khuôn khổ đo được ở mục 3, 7, 8 và 10. Bất cứ chỗ nào v3 nới lỏng v2 đều kèm điều kiện kiểm chứng.

---

## 1. Phân công theo sub-agent

| Work package              | Agent phụ trách                                                             | Phạm vi                                                   | Sản phẩm bàn giao                  | Cổng kiểm tra                     |
| ------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------- | --------------------------------- |
| WP1 Nghiên cứu & hợp đồng | `design-ux-researcher`                                                      | Người dùng, công việc lặp lại, tiêu chí khả dụng          | Mục 2, 3, 12 của tài liệu này      | Mọi khuyến nghị nêu rõ bằng chứng |
| WP2 Kiến trúc thông tin   | `design-ux-architect`                                                       | Điều hướng, khung trang, breadcrumb, responsive, bàn phím | Mục 5, 6                           | Không quá 4 nhóm điều hướng cấp 1 |
| WP3 Hệ thống thị giác     | `design-ui-designer`                                                        | Token, thang chữ, màu, kính, độ nổi, mật độ, bento        | `tokens/source.json` v2.0.0, mục 7 | `tokens:check`, `test:tokens`     |
| WP4 Hiện thực             | `engineering-frontend-developer`                                            | `globals.css`, AppShell, tour, primitive, trang nghiệp vụ | Mã trong `apps/web`                | `typecheck`, `lint`, `build`      |
| WP5 Tiếp cận              | `engineering-section-508-specialist`, `design-inclusive-visuals-specialist` | Focus, tương phản, vùng chạm, giảm chuyển động            | Mục 8, báo cáo kiểm tra            | Bàn phím + 390/768/1440           |
| WP6 Cổng hoàn thiện       | `design-ui-finish-gate-reviewer`                                            | Soát giao diện đã dựng, không soát bản mô tả              | PASS/HOLD kèm ảnh chụp             | Mục 13                            |

WP6 không vá lỗi thay WP4, chỉ chặn phát hành.

## 2. Ống kính sản phẩm

**Người dùng.** Nhân viên văn phòng dùng 4–6 giờ/ngày để xem việc của mình; quản lý dùng để duyệt, phân công, soát chấm công; quản trị hệ thống dùng để cấu hình tài khoản, quyền, chính sách. Cả ba nhóm thao tác trên cùng một bộ dữ liệu có quan hệ chặt: công việc ↔ dự án ↔ nhân sự ↔ chấm công ↔ nghỉ phép.

**Persona chính.** “Người làm việc theo hàng đợi” (cần biết hôm nay phải làm gì trong 10 giây đầu), “Quản lý duyệt” (cần thấy việc chờ mình và hậu quả khi duyệt), “Quản trị hệ thống” (cần thay đổi ít nhưng đúng, có nhật ký).

**Việc lặp lại hằng ngày.** Quét danh sách việc đang mở và việc quá hạn; chuyển trạng thái công việc; chấm công vào/ra; gửi và duyệt đơn nghỉ; đối chiếu bảng công theo kỳ.

**Việc hiếm nhưng rủi ro cao.** Đổi vai trò/quyền, vô hiệu hóa tài khoản hoặc nhân sự, khóa kỳ công, từ chối đơn đã duyệt, sửa dữ liệu đã qua kỳ.

**Đối tượng đọc đầu tiên của mỗi màn.** Trạng thái của bản ghi và người chịu trách nhiệm — không phải tiêu đề trang, không phải số liệu trang trí.

**Hành động chính.** Một hành động duy nhất cho mỗi màn: tạo bản ghi, chuyển trạng thái, hoặc duyệt đơn. Trên trang chủ, hành động chính là mở bảng công việc.

## 3. Xu hướng áp dụng và giới hạn

| Xu hướng           | Cách OneOps dùng                                                                       | Giới hạn bắt buộc                                                                            |
| ------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Widgets grid       | Trang chủ là lưới widget: nhịp hoàn thành, việc cần quan tâm, ghim, tín hiệu, lộ trình | Widget không thay bảng dữ liệu ở màn nghiệp vụ; mỗi widget có tiêu đề + ghi chú nêu phạm vi  |
| Bento grid         | `.bento` 12 cột với `.bento-3…12`, gộp theo mức ưu tiên thông tin                      | Tối đa 6 widget mỗi màn hình đầu; gộp cột ở 1180px, 1 cột ở 800px                            |
| Neon mists         | Nền `body` ba quầng sương tĩnh từ `mist-warm/violet/cyan`                              | Sương chỉ ở nền, không phủ lên chữ; không animation lặp; `background-attachment: fixed`      |
| Soft gradients     | Hero aurora, nút hành động chính, icon widget                                          | Chỉ dùng token `aurora-*`, `action-gradient-*`; không gradient trên vùng chữ dài             |
| Glassmorphism      | Thanh trên, rail, widget, modal, toast, thẻ đăng nhập                                  | Chỉ lớp chrome/nổi; bảng dữ liệu dùng `surface` đặc; có fallback khi thiếu `backdrop-filter` |
| Micro-interactions | Hover, pressed, ring, tour enter ≤ 240ms                                               | Không chuyển động làm dịch bố cục; `prefers-reduced-motion` tắt toàn bộ                      |
| Onboarding         | Tour 4 bước mở theo yêu cầu (không tự bật) + widget lộ trình 3 bước                    | Không chặn thao tác; luôn đóng được bằng `Esc`/“Bỏ qua”; không hỏi lại thông tin đã có       |

Không dùng: neumorphism, gradient 3D, glass trên bảng dữ liệu, animation để “trông có thiết kế”, ảnh nền trang trí làm tăng LCP.

## 4. 11 nguyên tắc vàng

| #   | Nguyên tắc                   | Quy tắc trong OneOps                                                                           |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Tập trung vào người dùng     | Mỗi màn trả lời “hôm nay tôi phải làm gì” trước “hệ thống có gì”                               |
| 2   | Nhất quán                    | Một bộ lớp trang, một thang chữ, một kiểu badge, một kiểu modal cho 27 module                  |
| 3   | Bối cảnh hình thành nội dung | Tiêu đề + mô tả nêu phạm vi dữ liệu và hệ quả thao tác; hero nêu ngày và phạm vi số liệu       |
| 4   | Trực quan                    | Trạng thái có nhãn chữ + chấm màu; số liệu có đơn vị; ngày theo `dd/MM/yyyy`                   |
| 5   | Quen thuộc                   | Bảng, tab, form, modal theo chuẩn web; không phát minh điều khiển mới                          |
| 6   | Kiểm soát của người dùng     | Thao tác phá hủy có xác nhận; lọc/tìm luôn xóa được; `Esc` đóng mọi lớp phủ; tour không tự bật |
| 7   | Phân cấp                     | Một `h1` mỗi màn; nhãn nhỏ chữ hoa cho nhóm; chỉ một nút đặc (gradient) mỗi vùng               |
| 8   | Không gian âm                | Nhịp dọc 24px giữa khối, `bento-gap` 16px trong lưới, 16–24px trong widget                     |
| 9   | Linh hoạt                    | Mật độ thoáng/gọn, sáng/tối, danh sách/bảng, thu gọn rail, mobile drawer                       |
| 10  | Tiếp cận                     | Tương phản ≥ 4,5:1 trên nền đặc; vùng chạm ≥ 40px; focus 2px; không chỉ dùng màu               |
| 11  | Kiểm thử khả dụng            | Kịch bản 5 tác vụ ở mục 13 chạy trước khi chốt                                                 |

## 5. Kiến trúc thông tin và điều hướng

- **Cấp 1 — rail 68px:** 4 phân hệ (`work-management`, `hr-management`, `tenant-system`) + thư viện UI. Icon 20px, nhãn 10px; mục đang chọn có vạch gradient 3px, nền `accent`, và `aria-current="page"` duy nhất.
- **Cấp 2 — panel 268px:** danh sách chức năng của phân hệ đang mở. Thu gọn được, ghi nhớ theo phân hệ.
- **Cấp 3 — nội dung:** mỗi trang tự sở hữu tiêu đề, mô tả, hành động, bộ lọc và vùng dữ liệu. Shell không vẽ lại tiêu đề trang.
- **Breadcrumb:** `system · page` nằm trong panel tiêu đề của shell; trang nghiệp vụ thêm breadcrumb riêng khi có luồng cha–con (ví dụ Dự án → Cột mốc).
- **Tìm kiếm toàn cục:** `Ctrl/⌘ K` mở palette liệt kê chức năng, `↑ ↓` di chuyển, `Enter` mở, `Esc` đóng. Không có đường cụt: mọi trang đều có rail, ô tìm kiếm và nút tạo mới.
- **Hướng dẫn nhanh:** 4 bước (rail → tìm kiếm → tạo mới → vùng dữ liệu), mở từ nút trên thanh trên, từ bảng tài khoản, từ widget lộ trình, hoặc sự kiện `oneops:tour`. Đã xem được ghi vào `localStorage` khoá `oneops.onboarding.v1`; không bao giờ tự mở lại.
- **Mobile ≤ 800px:** rail ẩn, mở bằng nút điều hướng; panel chiếm tối đa `100vw - 36px`, có backdrop và đóng bằng `Esc`. Tour chuyển sang thẻ toàn chiều rộng, không tràn ngang.

## 6. Khung trang chuẩn

```text
.page                 khung nội dung: max-width, lề, nhịp dọc 24px
  .hero               khối aurora: tiêu đề + mô tả + hành động + ô ưu tiên
    .eyebrow          nhãn nhóm 11px chữ hoa
    h1                tiêu đề 32/40 semibold (một h1 mỗi màn)
    .hero-lede        mô tả 14/24 muted, tối đa 72ch
    .hero-actions     nút sắp theo thứ tự: chính → phụ
  .bento              lưới 12 cột
    .widget           khối kính: .widget-head / .widget-body / .widget-foot
      .widget-icon    icon 32px, tone mặc định | violet | cyan | rose
      .kpi            số liệu lớn + nhãn + ghi chú
      .progress-ring  vòng tiến độ SVG 132px, tabular-nums
  .surface            khối dữ liệu đặc: viền 1px, radius 12px
    .data-table       bảng: header 40px nền inset, hàng theo mật độ
    .empty-state      trống có tiêu đề, giải thích, một hành động
  .page-footnote      ghi chú quy tắc nghiệp vụ 12/20 muted
```

Thang chữ: `micro 10/16`, `caption 12/20`, `body 14/24`, `label 14/20`, `section 18/28`, `title 24/32`, `heading 32/40`, `display 40/48`. Số liệu dùng `font-variant-numeric: tabular-nums`. Một font duy nhất (Inter) với đủ dấu tiếng Việt; không cắt chữ ở `line-height` của tiêu đề.

## 7. Màu, kính, độ nổi, mật độ

- **Nền:** `canvas` + ba quầng `mist-warm/violet/cyan` tĩnh. Khối dữ liệu `surface` đặc, vùng phụ `inset`, đường kẻ `line`/`line-soft`.
- **Chrome:** thanh trên và rail dùng `header-glass-bg`/`rail-glass-bg` (từ `glass-strong`), viền `glass-border`, `backdrop-filter: blur(20px) saturate(140%)`; thiếu hỗ trợ thì rơi về nền đặc.
- **Aurora:** `aurora-from/via/to` cho hero và thẻ đăng nhập; `glow-soft` cho quầng nhấn; `sheen` cho viền sáng 1px của nút.
- **Hành động chính:** `action-gradient-from → action-gradient-to` (light `#c94d00 → #a33c05`, dark `#ffc08a → #f09048`), chữ `action-foreground` giữ ≥ 4,5:1. Hover tăng sáng 6%, pressed dùng bóng trong.
- **Trạng thái:** success/warning/danger/info với nền `*-soft` + nhãn chữ. Neon chỉ dùng cho trang trí, không mang nghĩa trạng thái.
- **Bo góc:** control 8px, widget `widget-radius` 16px, panel bento `bento-radius` 16px, pill cho badge.
- **Độ nổi:** `elevation-glass` cho chrome/widget, `elevation-floating` cho popover, `elevation-modal` cho dialog. Không tự đặt bóng mới.
- **Mật độ:** thoáng 40/56/24px; gọn 34/44/16px. `widget-padding → panel-space`, `bento-gap → space-4` nên tự co theo mật độ.
- **Tương phản:** chữ chỉ đặt trên `surface`, `glass-strong` hoặc `canvas`; không đặt chữ trực tiếp trên `glass` mờ. `test:tokens` giữ 7 cặp chữ–nền ≥ 4,5:1 ở cả hai theme.

## 8. Trạng thái, chuyển động và tiếp cận

**12 trạng thái bắt buộc cho mọi điều khiển:** default, hover, pressed, disabled, focus-visible, loading, success, error, empty, skeleton, tooltip (khi chỉ có icon), confirm (khi phá hủy).

- Vùng dữ liệu có 4 trạng thái: đang tải (skeleton/dòng trạng thái), trống có hành động, lỗi có nút thử lại, có dữ liệu.
- Focus ring 2px từ token `ring`, offset 2px; không xóa outline nếu không thay bằng ring tương đương. Focus không bị thanh trên che khi cuộn (`scroll-margin-top`).
- Vùng chạm ≥ 40×40px ở mobile (WCAG 2.2 target size 24px là mức tối thiểu, OneOps giữ 40px); nút icon luôn có `aria-label`.
- **WCAG 2.2 AA:** focus not obscured, target size, dragging alternatives (kanban có nút chuyển trạng thái), consistent help (tour + footer trợ giúp ở cùng vị trí), redundant entry (form giữ dữ liệu khi lỗi), accessible authentication (không chặn dán mật khẩu, không yêu cầu nhớ bước trước, có autocomplete).
- Chuyển động ≤ 240ms (`duration-slow`); `prefers-reduced-motion: reduce` đặt transition/animation về 0 và tắt skeleton pulse, không dùng `!important` toàn cục.
- Không truyền đạt trạng thái chỉ bằng màu: luôn kèm nhãn chữ hoặc icon có nghĩa.
- Bảng có `caption` (có thể `sr-only`), `th scope="col"`, hành động nêu rõ bản ghi. Lưới không gây cuộn ngang ở 1440/768/390.

## 9. Biểu mẫu, bảng, dashboard

**Biểu mẫu.** Nhãn luôn hiển thị (không dùng placeholder thay nhãn); lỗi đặt cạnh trường và tóm tắt bằng `role="alert"`; giữ dữ liệu đã nhập khi lỗi; chặn submit lặp bằng trạng thái loading; form dài chia nhóm hoặc bước; không hỏi lại dữ liệu đã có.

**Bảng.** Ưu tiên bảng gọn: số căn phải, chữ số tabular, hàng theo mật độ, chọn nhiều hàng có thanh hành động, xuất CSV có phản hồi. Trạng thái rỗng phải có hành động tiếp theo.

**Dashboard.** Số liệu lớn kèm nhãn và mốc thời gian; mỗi widget có một câu nêu phạm vi; không lặp cùng một số ở 4 thẻ bằng nhau. Vòng tiến độ có `role="img"` + nhãn tiếng Việt.

**Thương mại điện tử.** OneOps không có luồng mua bán; khi thêm module thanh toán phải bổ sung: giá và phí tách bạch, tổng tiền trước khi xác nhận, trạng thái đơn rõ ràng, chính sách hoàn/hủy, và xác nhận hai lớp cho giao dịch.

## 10. Hiệu năng (Core Web Vitals)

- Ngân sách: LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1 trên mạng 4G và máy tầm trung.
- Sương nền là gradient tĩnh, không ảnh, không animation; `backdrop-filter` chỉ ở chrome/lớp nổi và tối đa 1 lớp lồng nhau.
- Ring, skeleton, widget có kích thước cố định trước khi có dữ liệu để tránh dịch bố cục.
- Font tự host qua `next/font`, hiển thị `swap`; icon lấy từ `lucide-react` (SVG inline), không tải bộ icon ngoài.
- Mọi ảnh có `alt` mô tả, ảnh dưới màn hình đầu dùng `loading="lazy"`, khai báo `width/height`.

## 11. Nội dung và tin cậy

- Không placeholder kiểu “Lorem ipsum”, “Nội dung…”, “Coming soon”. Trạng thái chưa có nói rõ chưa có gì và cách tạo.
- Ngày `dd/MM/yyyy` (hoặc `long` tiếng Việt khi là nhãn ngày), giờ `HH:mm`, số theo `vi-VN`; đơn vị luôn đi kèm số.
- Thông điệp lỗi nói việc cần làm, không đổ lỗi người dùng; lỗi hệ thống có mã hoặc nút thử lại.
- Tin cậy: nói rõ ai thấy dữ liệu, hành động nào bị ghi nhật ký (`/tenant-system/checklog`), thời gian tự khóa phiên; không hứa “bảo mật tuyệt đối”. Không hardcode secret/URL; không đưa dữ liệu cá nhân vào ví dụ, log hay prompt.

## 12. Mặc định bị cấm

- Glass hoặc gradient trên bảng dữ liệu, trên vùng chữ dài, hoặc lồng quá 2 lớp kính.
- Quầng sương/neon mang nghĩa trạng thái hoặc thay thế tương phản chữ.
- Lưới 4 thẻ KPI bằng nhau ở đầu mọi màn hình; widget không có tiêu đề/ghi chú phạm vi.
- Nút “Xem chi tiết” chung chung thay cho hành động nghiệp vụ.
- Icon một mình trong bảng mà không có nhãn hoặc tooltip.
- Modal chứa form dài quá 3 nhóm trường mà không chia bước.
- Empty state không có hành động tiếp theo; tour tự bật và chặn thao tác.
- Thêm màu hex/RGB, `!important`, z-index tùy ý hoặc theme riêng trong feature.

## 13. Kiểm thử và cổng PASS

**Kịch bản 5 tác vụ** (chạy với 5 người, 3 nhóm vai trò):

1. Tìm công việc quá hạn của mình và chuyển sang “Đang làm” — ≤ 45 giây, 0 lỗi.
2. Chấm công vào ca sáng — ≤ 30 giây, không cần đọc hướng dẫn.
3. Lọc danh sách nhân sự theo phòng ban và mở hồ sơ — ≤ 40 giây.
4. Duyệt một đơn nghỉ có ghi chú — ≤ 50 giây, không bấm nhầm nút hủy.
5. Trên mobile, xem bảng công kỳ này và quay lại danh sách — không cuộn ngang.

**Cổng tự động:** `npm run architecture:check`, `unused:check`, `tokens:check`, `typecheck`, `lint`, `format:check`, `build`; thêm `test:tokens` khi đổi token, `test:api` khi đổi API/database, `test:e2e` khi đổi UI/route (bao gồm `tests/onboarding.spec.ts`).

**Cổng PASS** chỉ khi: đối tượng đọc đầu tiên và hành động chính thấy được trong khung nhìn đầu; mọi trạng thái tải/trống/lỗi có thiết kế; 1440/768/390 không tràn ngang; bàn phím đi hết luồng chính và tour; ảnh chụp sáng/tối lưu trong `docs/screenshots/`.

## 14. Bản đồ 26 tiêu chí → nơi đáp ứng

| Nhóm tiêu chí                                          | Đáp ứng tại                    |
| ------------------------------------------------------ | ------------------------------ |
| Nghiên cứu người dùng, persona, use case               | Mục 2                          |
| IA, breadcrumb, sitemap                                | Mục 5                          |
| User flow và luồng lỗi                                 | Mục 9, 13                      |
| Khả dụng, phòng lỗi                                    | Mục 4, 9                       |
| Điều hướng, trạng thái chọn, tìm kiếm, không đường cụt | Mục 5                          |
| Trạng thái tương tác (12 trạng thái)                   | Mục 8                          |
| Phản hồi và xử lý lỗi                                  | Mục 8, 9                       |
| Nội dung, định dạng ngày/số                            | Mục 11                         |
| Bố cục, lưới, không tràn ngang                         | Mục 6, 8                       |
| Kiểu chữ, dấu tiếng Việt                               | Mục 6                          |
| Hệ màu, tương phản, không chỉ dùng màu                 | Mục 7, 8                       |
| Thang khoảng cách                                      | Mục 4, 7                       |
| Nhất quán thành phần                                   | Mục 4, `docs/DESIGN-SYSTEM.md` |
| Icon                                                   | Mục 10 (lucide, `aria-hidden`) |
| Hình ảnh, alt, lazy load                               | Mục 10                         |
| Micro-interaction, `prefers-reduced-motion`            | Mục 8                          |
| Responsive desktop/laptop/tablet/mobile                | Mục 5, 6                       |
| WCAG 2.2 AA                                            | Mục 8                          |
| Design tokens                                          | Mục 7, `tokens/README.md`      |
| Nhất quán sáng/tối                                     | Mục 7, `test:tokens`           |
| Hiệu năng, CWV                                         | Mục 10                         |
| Thiết kế biểu mẫu                                      | Mục 9                          |
| Bảng dữ liệu và dashboard                              | Mục 6, 9                       |
| Thương mại điện tử                                     | Mục 9 (chưa áp dụng)           |
| Bảo mật và tin cậy                                     | Mục 11                         |

Tài liệu liên quan: `DESIGN-SYSTEM.md` (thư viện thành phần), `tokens/README.md` (nguồn token), `ARCHITECTURE.md` (ranh giới mã).
