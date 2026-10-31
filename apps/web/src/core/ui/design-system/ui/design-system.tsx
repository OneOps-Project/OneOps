"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Component,
  Download,
  Layers3,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  uiSections,
  componentCount,
} from "@/core/ui/design-system/schema/catalog";
import { downloadDesignTokens } from "@/core/ui/design-system/api/token-export";
import { useUIPreferences } from "@/core/ui/design-system/ui/primitives/preferences";
import { cn } from "@/core/ui/design-system/lib/utils";
import { AppearanceControls } from "@/core/ui/design-system/ui/primitives/preferences";
import {
  Badge,
  Card,
  EmptyState,
} from "@/core/ui/design-system/ui/primitives/foundations";
import { Button } from "@/core/ui/design-system/ui/primitives/button";
import { SearchInput } from "@/core/ui/design-system/ui/primitives/forms";
import {
  FoundationsDemo,
  ActionsDemo,
} from "@/core/ui/design-system/ui/foundations-demo";
import { FormsDemo } from "@/core/ui/design-system/ui/forms-demo";
import {
  NavigationDemo,
  FeedbackDemo,
  OverlaysDemo,
} from "@/core/ui/design-system/ui/interactions-demo";
import {
  DataDemo,
  PatternsDemo,
} from "@/core/ui/design-system/ui/patterns-demo";

const demos = {
  foundations: FoundationsDemo,
  actions: ActionsDemo,
  forms: FormsDemo,
  navigation: NavigationDemo,
  feedback: FeedbackDemo,
  overlays: OverlaysDemo,
  data: DataDemo,
  patterns: PatternsDemo,
};
export function DesignSystem() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const normalized = query.trim().toLocaleLowerCase("vi");
  const visible = uiSections.filter(
    (section) =>
      (category === "all" || section.id === category) &&
      `${section.title} ${section.description} ${section.items.join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(normalized),
  );
  const { preferences } = useUIPreferences();
  const exportTokens = () =>
    downloadDesignTokens(preferences.theme, preferences.density);

  return (
    <div className="min-h-full text-foreground">
      <div className="flex items-center justify-between gap-4 border-b border-glass-border bg-glass px-5 py-3 backdrop-blur-glass sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg border border-primary/15 bg-accent text-primary">
            <Layers3 className="size-4" />
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold">
              OneOps{" "}
              <span className="font-normal text-subtle-foreground">/</span>{" "}
              Design system
            </span>
            <Badge className="text-[10px]">v3.0</Badge>
          </div>
        </div>
        <div className="hidden gap-3 sm:flex">
          <AppearanceControls />
          <Button asChild variant="secondary" size="sm" className="h-10">
            <Link href="/design-tokens">Design tokens</Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-10"
            onClick={exportTokens}
          >
            <Download />
            Xuất tokens
          </Button>
        </div>
        <div className="sm:hidden">
          <AppearanceControls compact />
        </div>
      </div>
      <div className="mx-auto flex max-w-[1720px] items-start gap-8 px-5 py-7 sm:px-8 lg:gap-10 lg:py-10">
        <aside className="sticky top-6 hidden w-48 shrink-0 lg:block">
          <div className="mb-7">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-subtle-foreground">
              Thư viện giao diện
            </p>
            <button
              onClick={() => {
                setCategory("all");
                setQuery("");
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm font-medium transition-colors",
                category === "all"
                  ? "border border-primary/10 bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Component className="size-4" />
              Tất cả thành phần
              <span className="ml-auto text-[10px] opacity-70">
                {componentCount}
              </span>
            </button>
          </div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-subtle-foreground">
            Danh mục
          </p>
          <nav aria-label="Danh mục thư viện UI" className="space-y-1">
            {uiSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setCategory(section.id);
                  setQuery("");
                  document
                    .getElementById("catalog-start")
                    ?.scrollIntoView({ block: "start" });
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-xs transition-colors",
                  category === section.id
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="font-mono text-[10px] opacity-60">
                  {section.number}
                </span>
                {section.title}
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-card border border-glass-border bg-glass p-4 shadow-glass backdrop-blur-glass">
            <ShieldCheck className="mb-3 size-5 text-success" />
            <p className="text-xs font-semibold">Thiết kế có hệ thống</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Cùng token, cùng hành vi trên các chức năng nghiệp vụ.
            </p>
            <Link
              href="/home"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary"
            >
              Xem ứng dụng
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <section className="hero mb-9" aria-labelledby="ds-title">
            <div className="hero-copy">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Badge variant="brand">
                  <span className="size-1.5 rounded-full bg-current" />
                  OneOps UI · Aurora
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Tailwind CSS · React · Radix
                </span>
              </div>
              <h1
                id="ds-title"
                className="max-w-2xl text-3xl leading-tight font-semibold tracking-[-.035em] sm:text-[40px] sm:leading-[1.2]"
              >
                Hệ thống thiết kế
                <br />
                <span className="text-primary">cho mọi luồng nghiệp vụ.</span>
              </h1>
              <p className="hero-lede max-w-xl">
                Nền sương dịu, khung kính mờ và lưới bento: cùng một bộ token,
                cùng một hành vi, từ trường nhập liệu đến quy trình xử lý công
                việc.
              </p>
              <div className="hero-actions mt-7">
                <Button asChild>
                  <a href="#catalog-start">
                    Khám phá thành phần
                    <ArrowRight />
                  </a>
                </Button>
                <Button variant="secondary" onClick={exportTokens}>
                  <Download />
                  Tải design tokens
                </Button>
              </div>
              <div className="hero-meta gap-x-8 border-t border-glass-border pt-6">
                {[
                  [`${componentCount}+`, "thành phần & mẫu"],
                  ["04", "phân hệ đang dùng"],
                  ["02", "giao diện sáng / tối"],
                  ["AA", "mục tiêu tương phản"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <span className="text-xl font-semibold tracking-tight">
                      {value}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <div id="catalog-start" className="mb-7 scroll-mt-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Thư viện thành phần
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Thử trực tiếp trạng thái và tương tác của từng nhóm.
                </p>
              </div>
              <SearchInput
                value={query}
                onValueChange={setQuery}
                label="Tìm thành phần UI"
                placeholder="Tìm button, bảng, biểu mẫu…"
                className="w-full sm:w-72"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              <Button
                size="sm"
                variant={category === "all" ? "soft" : "secondary"}
                onClick={() => setCategory("all")}
              >
                Tất cả
              </Button>
              {uiSections.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={category === s.id ? "soft" : "secondary"}
                  onClick={() => setCategory(s.id)}
                >
                  {s.title}
                </Button>
              ))}
            </div>
            {(query || category !== "all") && (
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{visible.length} nhóm phù hợp</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                  }}
                >
                  <X />
                  Xóa điều kiện
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-10">
            {visible.map((section) => {
              const Demo = demos[section.id];
              return (
                <section
                  key={section.id}
                  id={`ui-${section.id}`}
                  aria-labelledby={`heading-${section.id}`}
                  className="scroll-mt-6"
                >
                  <div className="mb-5 flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-accent font-mono text-xs text-primary">
                      {section.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2
                          id={`heading-${section.id}`}
                          className="text-lg font-semibold tracking-tight"
                        >
                          {section.title}
                        </h2>
                        <Badge className="text-[10px]">
                          {section.items.length} thành phần
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <Demo />
                </section>
              );
            })}
            {!visible.length && (
              <Card>
                <EmptyState
                  icon={<Search className="size-6" />}
                  title="Không tìm thấy thành phần"
                  description="Thử tên tiếng Việt hoặc tên component như Input, Dialog, Data table."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                      }}
                    >
                      Xem tất cả
                    </Button>
                  }
                />
              </Card>
            )}
          </div>
          <footer className="mt-12 border-t border-border pt-6 pb-3 text-xs leading-6 text-subtle-foreground">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>OneOps Design System · v3.0 · Nền Aurora</p>
              <Link
                href="/home"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                Trở về ứng dụng
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <p className="mt-2">
              * Màu hành động và nội dung hướng tới WCAG AA; chưa phải chứng
              nhận toàn bộ sản phẩm. Ví dụ trong thư viện chỉ dùng dữ liệu minh
              họa.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
