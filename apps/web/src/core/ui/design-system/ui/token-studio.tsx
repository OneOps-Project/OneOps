"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Layers3,
  Palette,
} from "lucide-react";
import data from "@/core/ui/design-system/schema/token-data.json";
import { downloadDesignTokens } from "@/core/ui/design-system/api/token-export";
import { cn } from "@/core/ui/design-system/lib/utils";
import {
  AppearanceControls,
  useUIPreferences,
} from "@/core/ui/design-system/ui/primitives/preferences";
import { useWorkspace } from "@/core/ui/design-system/ui/primitives/workspace";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/core/ui/design-system/ui/primitives/foundations";
import { Button } from "@/core/ui/design-system/ui/primitives/button";
import {
  SearchInput,
  Select,
} from "@/core/ui/design-system/ui/primitives/forms";

const categories: Record<string, string> = {
  all: "Tất cả nhóm",
  color: "Màu sắc",
  typography: "Typography",
  spacing: "Khoảng cách",
  sizing: "Kích thước",
  radius: "Bo góc",
  elevation: "Bóng đổ",
  motion: "Chuyển động",
  layer: "Z-index",
  breakpoint: "Responsive",
  component: "Component",
  density: "Mật độ",
  compatibility: "Alias tương thích",
};
const layers: Record<string, string> = {
  all: "Tất cả",
  primitive: "Nền tảng",
  semantic: "Ngữ nghĩa",
  component: "Component",
  density: "Mật độ",
};
type Row = (typeof data.catalog)[number];
export function TokenStudio() {
  const { preferences } = useUIPreferences();
  const { notify } = useWorkspace();
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState("all");
  const [category, setCategory] = useState("all");
  const [copied, setCopied] = useState("");
  const profile = (
    data.profiles as Record<string, { tokens: Record<string, string | number> }>
  )[`${preferences.theme}-${preferences.density}`];
  const values = profile.tokens;
  const filtered = data.catalog.filter(
    (row) =>
      (layer === "all" || row.layer === layer) &&
      (category === "all" || row.category === category) &&
      `${row.name} ${row.description} ${row.value}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi").trim()),
  );
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      notify("Đã sao chép token.");
    } catch {
      notify("Trình duyệt chưa cho phép sao chép. Bạn có thể tải file token.");
    }
  }
  function current(row: Row) {
    return String(values[row.name]);
  }
  return (
    <div className="min-h-full text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border bg-glass px-5 py-3 backdrop-blur-glass sm:px-8">
        <Link
          href="/design-system"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <Layers3 className="size-4" />
          OneOps Design System
          <span className="mx-1 text-subtle-foreground">/</span>
          <strong className="font-medium text-foreground">Tokens</strong>
        </Link>
        <AppearanceControls />
      </div>
      <div className="mx-auto max-w-[1500px] space-y-7 px-5 py-7 sm:px-8 sm:py-10">
        <section className="hero" aria-labelledby="tokens-title">
          <div className="hero-copy max-w-none">
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="brand">
                <Palette className="size-3" />
                OneOps Tokens
              </Badge>
              <Badge>v{data.version}</Badge>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1
                  id="tokens-title"
                  className="text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  Design tokens
                </h1>
                <p className="hero-lede max-w-2xl">
                  Một nguồn dữ liệu cho màu sắc, chữ, khoảng cách và trạng thái
                  của toàn bộ giao diện. Thay đổi token gốc để đồng bộ các
                  component.
                </p>
              </div>
              <div className="hero-actions">
                <Button
                  onClick={() =>
                    downloadDesignTokens(preferences.theme, preferences.density)
                  }
                >
                  <Download />
                  Tải cấu hình hiện tại
                </Button>
                <Button asChild variant="secondary">
                  <a href="/tokens/oneops.tokens.json" download>
                    <Download />
                    Tải bộ đầy đủ
                  </a>
                </Button>
              </div>
            </div>
            <div className="mt-7 grid gap-3 border-t border-glass-border pt-5 sm:grid-cols-3">
              {[
                [String(data.catalog.length), "token có tên và mô tả"],
                ["03", "lớp tham chiếu"],
                ["04", "cấu hình theme × mật độ"],
              ].map(([value, label]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold tabular-nums">
                    {value}
                  </span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "01 · Nền tảng",
              example: "brand-700 → #bd4600",
              desc: "Palette, khoảng cách, cỡ chữ, thời gian và lớp hiển thị.",
            },
            {
              title: "02 · Ngữ nghĩa",
              example: "action → {brand-700}",
              desc: "Đặt tên theo mục đích; đổi giá trị giữa sáng và tối.",
            },
            {
              title: "03 · Component",
              example: "button-bg → {action}",
              desc: "Button, input, card, bảng và dialog dùng cùng một hợp đồng.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold">{item.title}</h2>
                <code className="mt-3 block break-words rounded-md bg-muted px-3 py-2 text-xs leading-5 text-primary">
                  {item.example}
                </code>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {item.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Nhận diện & màu vai trò</CardTitle>
              <CardDescription>
                Cam #f06000 giữ vai trò thương hiệu. Màu thao tác được điều
                chỉnh theo độ tương phản của từng theme.
              </CardDescription>
            </div>
            <Badge variant="info">
              {preferences.theme === "light" ? "Sáng" : "Tối"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {data.catalog
                .filter(
                  (row) =>
                    row.layer === "primitive" && row.name.startsWith("brand-"),
                )
                .map((row) => (
                  <button
                    key={row.name}
                    className="rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
                    onClick={() => copy(`--${row.name}: ${current(row)};`)}
                    aria-label={`Sao chép ${row.name}`}
                  >
                    <span
                      className="block h-16 rounded-control border border-foreground/5"
                      style={{ background: current(row) }}
                    />
                    <span className="mt-2 block text-xs font-medium">
                      {row.name.replace("brand-", "")}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                      {current(row)}
                    </span>
                  </button>
                ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
              {[
                "surface",
                "foreground",
                "action",
                "ring",
                "success",
                "warning",
                "danger",
                "info",
              ].map((name) => (
                <div
                  key={name}
                  className="flex min-w-0 items-center gap-3 rounded-control border border-border p-3"
                >
                  <span
                    className="size-8 shrink-0 rounded-md border border-foreground/10"
                    style={{ background: String(values[name]) }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{name}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {String(values[name])}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Tra cứu token</CardTitle>
              <CardDescription>
                Giá trị hiển thị theo theme và mật độ đang chọn. Bấm vào giá trị
                để sao chép khai báo CSS.
              </CardDescription>
            </div>
            <Badge>
              {filtered.length} / {data.catalog.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                label="Tìm design token"
                value={query}
                onValueChange={setQuery}
                placeholder="Tìm tên, vai trò hoặc giá trị…"
                className="w-full sm:max-w-80"
              />
              <Select
                aria-label="Lọc lớp token"
                className="w-full sm:w-44"
                value={layer}
                onChange={(e) => setLayer(e.target.value)}
              >
                {Object.entries(layers).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Lọc nhóm token"
                className="w-full sm:w-48"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {Object.entries(categories).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              {(query || layer !== "all" || category !== "all") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setQuery("");
                    setLayer("all");
                    setCategory("all");
                  }}
                >
                  Đặt lại
                </Button>
              )}
            </div>
            <div className="relative mt-5 max-h-[600px] overflow-auto rounded-control border border-border">
              <table className="w-full min-w-[750px] border-collapse text-left">
                <caption className="sr-only">
                  Danh mục design token OneOps
                </caption>
                <thead className="sticky top-0 z-10">
                  <tr>
                    {[
                      "Token / vai trò",
                      "Lớp",
                      "Giá trị hiện tại",
                      "Tham chiếu / giá trị gốc",
                    ].map((label) => (
                      <th
                        key={label}
                        className="bg-background px-4 py-3 text-xs font-medium text-muted-foreground"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const value = current(row);
                    const declaration = `--${row.name}: ${value};`;
                    return (
                      <tr
                        key={row.name}
                        className="border-t border-border hover:bg-background"
                      >
                        <td className="max-w-80 px-4 py-3">
                          <code className="text-xs font-medium">
                            --{row.name}
                          </code>
                          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                            {row.description}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{layers[row.layer]}</Badge>
                        </td>
                        <td className="max-w-80 px-4 py-3">
                          <button
                            className="flex max-w-full items-center gap-2 rounded text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => copy(declaration)}
                            aria-label={`Sao chép token ${row.name}`}
                          >
                            {row.type === "color" && (
                              <span
                                className="size-5 shrink-0 rounded border border-foreground/10"
                                style={{ background: value }}
                              />
                            )}
                            <code className="break-all text-xs">{value}</code>
                            {copied === declaration ? (
                              <Check className="size-3 shrink-0 text-success" />
                            ) : (
                              <Copy className="size-3 shrink-0 text-subtle-foreground" />
                            )}
                          </button>
                          {row.category === "spacing" && (
                            <span
                              className="mt-2 block h-1 rounded bg-primary/60"
                              style={{ width: `min(${value},180px)` }}
                            />
                          )}
                          {row.category === "radius" && (
                            <span
                              className="mt-2 block h-7 w-12 border border-input bg-muted"
                              style={{ borderRadius: value }}
                            />
                          )}
                        </td>
                        <td className="max-w-64 px-4 py-3 font-mono text-[11px] break-words text-subtle-foreground">
                          {String(row.value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <EmptyState
                title="Không tìm thấy token"
                description="Thử một vai trò khác, như action, space hoặc button."
              />
            )}
          </CardContent>
        </Card>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Typography & nhịp điệu</CardTitle>
                <CardDescription>
                  Inter · Các vai trò có cỡ chữ, line-height và weight riêng.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                "display",
                "heading",
                "title",
                "section",
                "body",
                "label",
                "caption",
              ].map((role) => (
                <div
                  key={role}
                  className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <p
                    style={{
                      fontSize: String(values[`type-${role}-size`]),
                      lineHeight: String(values[`type-${role}-line`]),
                      fontWeight: Number(values[`type-${role}-weight`]),
                    }}
                  >
                    Công việc công việc
                  </p>
                  <code className="text-[10px] text-muted-foreground">
                    {role} · {String(values[`type-${role}-size`])} /{" "}
                    {String(values[`type-${role}-line`])}
                  </code>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Kiểm tra tương phản</CardTitle>
                <CardDescription>
                  Các cặp chữ–nền được tính từ giá trị token đã resolve. Mục
                  tiêu cho chữ thường: 4,5:1.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.contrast
                .filter((pair) => pair.theme === preferences.theme)
                .map((pair) => (
                  <div
                    key={pair.label}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded px-3 py-1.5 text-sm font-semibold"
                        style={{
                          background: pair.background,
                          color: pair.foreground,
                        }}
                      >
                        Aa
                      </span>
                      <span className="text-xs font-medium">{pair.label}</span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 font-mono text-xs",
                        pair.ratio >= 4.5 ? "text-success" : "text-destructive",
                      )}
                    >
                      <CheckCircle2 className="size-3.5" />
                      {pair.ratio}:1
                    </span>
                  </div>
                ))}
              <p className="pt-2 text-[11px] leading-5 text-muted-foreground">
                Đây là kiểm tra từng cặp token, không thay thế đánh giá khả năng
                truy cập của toàn bộ giao diện.
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Dùng trong thiết kế & mã nguồn</CardTitle>
              <CardDescription>
                Sửa nguồn JSON, sinh lại CSS và các file cấu hình để giữ đồng
                bộ.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Nguồn duy nhất",
                  text: "tokens/source.json",
                  detail:
                    "Palette, alias, component và mật độ đều có tên và mô tả.",
                },
                {
                  title: "CSS & Tailwind",
                  text: "npm run tokens:build",
                  detail: "Sinh biến CSS và ánh xạ utility Tailwind tự động.",
                },
                {
                  title: "Kiểm tra đồng bộ",
                  text: "npm run test:tokens",
                  detail:
                    "Kiểm tra alias, vòng tham chiếu, độ tương phản và file sinh.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-control border border-border bg-background p-4"
                >
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <code className="mt-3 block break-all text-xs text-primary">
                    {item.text}
                  </code>
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="secondary" size="sm">
                <a href="/tokens/oneops.css" download>
                  <Download />
                  CSS variables
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href="/tokens/oneops.tailwind.css" download>
                  <Download />
                  Tailwind mapping
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href="/tokens/light-comfortable.json" download>
                  Sáng / thoáng
                  <ArrowUpRight />
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href="/tokens/dark-compact.json" download>
                  Tối / gọn
                  <ArrowUpRight />
                </a>
              </Button>
              <Button asChild variant="link" size="sm">
                <Link href="/design-system">
                  Xem thư viện component
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <footer className="border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
          OneOps Design Tokens v{data.version} · Một hệ token cho toàn hệ thống.
        </footer>
      </div>
    </div>
  );
}
