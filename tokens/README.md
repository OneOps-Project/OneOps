# OneOps Design Tokens · v2.0.0

Bộ **233 token** phục vụ hệ thống OneOps “Aurora Ops”, xây từ nhận diện cam `#f06000`, nội dung xanh đậm `#00204d`, font Inter và lớp kính/sương bento của giao diện hiện tại.

Xem trực tiếp tại `/design-tokens`: palette, vai trò, tham chiếu, giá trị theo theme/mật độ, typography và tương phản. Có tìm kiếm, lọc lớp/nhóm, sao chép khai báo CSS và tải JSON/CSS.

## Ba lớp

| Lớp       | Ví dụ                                   | Vai trò                                         |
| --------- | --------------------------------------- | ----------------------------------------------- |
| Primitive | `brand-700 = #bd4600`, `space-4 = 16px` | Giá trị gốc, độc lập component                  |
| Semantic  | `action = {brand-700}`                  | Vai trò giao diện; light/dark có cùng tên       |
| Component | `button-bg = {action}`                  | Hợp đồng cho Button, Input, Card, Table, Dialog |

Density là một trục cấu hình bổ sung, không phải lớp thứ tư. `button-height → control-height` tự đổi từ 40px sang 34px khi chọn compact.

## Các nhóm token

- **Color:** brand 50–900, neutral, surface/canvas/elevated, text, action hover/pressed/disabled, selected/hover surface, `line-soft` cho đường kẻ hàng bảng, `surface-inset` cho vùng chìm, focus, success/warning/danger/info và overlay.
- **Aurora / glass:** `glass`, `glass-strong`, `glass-border`, `glass-highlight` cho lớp kính; `mist-warm`, `mist-violet`, `mist-cyan` cho quầng nền; `aurora-from/via/to` cho hero; `glow-soft`, `sheen` cho nhấn; `action-gradient-from/to` cho nút hành động chính. Bộ `prism-violet/cyan/rose` chỉ dùng cho icon và trang trí, không mang nghĩa trạng thái.
- **Typography:** family sans/mono, weight 400/500/600/700; display 40/48, heading 32/40, title 24/32, section 18/28, body 14/24, label 14/20, caption 12/20, micro 10/16, eyebrow 11/16.
  Kèm `tracking-tight` (-0.02em) cho tiêu đề lớn và `tracking-eyebrow` (0.08em) cho nhãn nhỏ toàn giao diện. Cặp số là font size / line height, đơn vị px.
- **Spacing:** hệ 4px, bước nhỏ 2px, thang 0–96px.
- **Sizing:** icon 12/16/20/24/32px; control, row, panel theo mật độ; header 56px, rail 68px, menu phụ 270px; bề ngang nội dung `page-max-width` 1560px, lề trang `page-gutter` 24px.
- **Radius:** 0/4/6/8/12/14/16px và pill; control 8px, panel 14px, panel lớn 12px (`radius-xl`), `bento-radius` và `widget-radius` cho lưới/widget.
- **Elevation:** none, xs, panel, floating, modal, `elevation-glass` (bóng mềm + viền sáng 1px cho chrome và widget); shadow ngữ nghĩa riêng theo light/dark.
- **Motion:** 0/120/160/240/1800ms, standard/enter/exit easing; tắt chuyển động nhanh/normal/slow khi người dùng bật giảm chuyển động.
- **Layer:** base 0, sticky 10, sidebar 30, header 40, overlay 100, dialog 101, popover 110, tooltip 120, toast 1000.
- **Responsive:** sm 640, md 768, lg 1024, xl 1280, 2xl 1536px. Các breakpoint mô tả chuẩn responsive mới; breakpoint 800px của rail cũ vẫn được giữ trong layout hiện tại.

## Bốn cấu hình

| Theme | Mật độ      | Control | Row  | Panel padding |
| ----- | ----------- | ------- | ---- | ------------- |
| Light | Comfortable | 40px    | 56px | 24px          |
| Light | Compact     | 34px    | 44px | 16px          |
| Dark  | Comfortable | 40px    | 56px | 24px          |
| Dark  | Compact     | 34px    | 44px | 16px          |

Tên token không đổi giữa các cấu hình. Header và nhận diện vẫn giữ cam thương hiệu; action dùng `#bd4600` với chữ trắng ở light và `#ffad6b` với chữ tối ở dark.

## Nguồn và đầu ra

**Chỉ sửa `tokens/source.json`.** Mỗi token có `value`, `type`, `category`, `description`. Alias dùng `{tên-token}`; khi xuất CSS thành `var(--tên-token)`, khi xuất profile thành giá trị đã resolve.

```sh
npm run tokens:build   # Sinh CSS, Tailwind mapping, catalog và JSON
npm run tokens:check   # Kiểm tra file đã sinh có khớp nguồn không
npm run test:tokens    # Kiểm tra alias, vòng lặp, profile và tương phản
```

`npm run build` tự chạy `tokens:check` trước khi build Next.js. File đã sinh được lưu cùng source để có thể chạy ứng dụng ngay, không cần thêm dependency tạo token.

`npm run dev` tự sinh lại token qua `prepare:dev` trước khi khởi động API và Next.js bằng Webpack. Khi thêm file CSS mới trong lúc server đang chạy và gặp lỗi phân giải import cũ, khởi động lại bằng lệnh này.

| File                                                        | Mục đích                                 |
| ----------------------------------------------------------- | ---------------------------------------- |
| `tokens/source.json`                                        | Nguồn duy nhất với alias và mô tả        |
| `apps/web/src/core/ui/styles/tokens.css`                    | Biến CSS, theme/density, reduced motion  |
| `apps/web/src/core/ui/styles/token-theme.css`               | Ánh xạ Tailwind 4 `@theme inline`        |
| `apps/web/src/core/ui/design-system/schema/token-data.json` | Dữ liệu của trang tra cứu và export      |
| `apps/web/public/tokens/oneops.tokens.json`                 | Bộ đầy đủ có alias                       |
| `apps/web/public/tokens/light-comfortable.json`             | Profile sáng / thoáng đã resolve         |
| `apps/web/public/tokens/light-compact.json`                 | Profile sáng / gọn đã resolve            |
| `apps/web/public/tokens/dark-comfortable.json`              | Profile tối / thoáng đã resolve          |
| `apps/web/public/tokens/dark-compact.json`                  | Profile tối / gọn đã resolve             |
| `apps/web/public/tokens/oneops.css`                         | CSS dùng lại ngoài ứng dụng              |
| `apps/web/public/tokens/oneops.tailwind.css`                | Mapping Tailwind dùng cùng CSS variables |

## Sử dụng

```css
.my-button {
  background: var(--button-bg);
  color: var(--button-text);
  height: var(--button-height);
  border-radius: var(--button-radius);
}
```

```tsx
<div className="widget">
  <header className="widget-head">
    <h2 className="widget-title">Việc cần quan tâm</h2>
    <p className="widget-note">5 việc còn mở</p>
  </header>
  <Button>Lưu thay đổi</Button>
</div>
```

Utility `bg-primary`, `text-primary-foreground`, `border-border`, `rounded-control`, `rounded-panel`, `rounded-card`, `bg-glass`, `border-glass-border`, `shadow-glass`, `backdrop-blur-glass` đều lấy từ token ngữ nghĩa. `.btn-gradient` ghép gradient `action-gradient-*` lên `bg-primary`; `.widget`/`.hero`/`.bento` là lớp bố cục dùng chung trong `globals.css`.

## Quy tắc thiết kế

1. Dùng vai trò ngữ nghĩa trong component; tránh gắn trực tiếp màu brand vào nội dung thông thường.
2. Dùng cam đậm cho chữ/hành động cần tương phản; cam 500 giữ vai trò nhận diện.
3. Không chỉ dùng màu để thông báo trạng thái; luôn có nhãn hoặc icon phù hợp.
4. Chọn spacing theo hệ 4px, bo góc theo vai trò control/panel; không tạo thêm mức cho từng màn.
5. Chỉ dùng z-index trong thang lớp, kiểm tra dropdown/tooltip trên dialog.
6. Kiểm tra cả 4 profile khi thêm alias hoặc component mới.
7. Kính và gradient chỉ dành cho chrome/lớp nổi; bảng dữ liệu dùng `surface` đặc. Không đặt chữ trên `glass` mờ mà không có nền `glass-strong` hay `surface` bên dưới.
8. Khi thêm token aurora/prism mới, thêm đồng thời ở light và dark để giữ kiểm tra tên song song.

Kiểm tra tự động hiện bao gồm 7 cặp chữ–nền chính trên cả hai theme, mục tiêu ≥4,5:1. Đây là kiểm tra cặp token đã khai báo; các tổ hợp tùy ý và toàn bộ sản phẩm vẫn cần được đánh giá riêng.
