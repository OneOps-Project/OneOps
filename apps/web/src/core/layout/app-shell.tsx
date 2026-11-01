"use client";

import Link from "next/link";
import { AccountSessionSummary } from "@/features/tenant-system/access-control/accounts";
import { navigationIcons, switchApp, vi } from "@/icons";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { getModule, modules } from "@/core/config/feature-registry";
import { useWorkspace } from "@/core/ui/primitives/workspace";
import { Icon } from "@/core/ui/primitives/icon";
import { Button } from "@/core/ui/primitives/button";
import { BookOpen, Palette } from "lucide-react";
import { AppearanceControls } from "@/core/ui/primitives/preferences";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={<div className="loading-screen">Đang tải giao diện…</div>}
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const params = useSearchParams();
  const config = getModule(path.replace(/^\/|\/$/g, "")) || modules[0];
  const isLibrary = path === "/design-system" || path === "/design-tokens";
  const [menuState, setMenuState] = useState<Record<string, boolean>>({});
  const collapsed = menuState[config.id] ?? config.navigation.collapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState(false);
  const { openCreate } = useWorkspace();
  const hasSections = !isLibrary && config.navigation.items.length > 0;
  const section =
    params.get("section") ||
    (params.get("scope") === "all" ? config.navigation.allSection : "") ||
    config.navigation.defaultSection;
  const submenuTitle = config.navigation.title;
  return (
    <>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="topbar">
        <button
          className="app-switch icon-button"
          aria-label="Mở điều hướng"
          onClick={() => {
            if (window.innerWidth <= 800) setMobileOpen(!mobileOpen);
            else if (hasSections)
              setMenuState({ ...menuState, [config.id]: !collapsed });
            else
              document
                .querySelector<HTMLInputElement>(
                  '[aria-label="Tìm kiếm chức năng"]',
                )
                ?.focus();
          }}
        >
          <img src={switchApp.src} alt="" width={20} height={20} />
        </button>
        <Link
          href="/home"
          className="brand"
          aria-label="OneOps — Không gian làm việc"
        >
          <span className="font-bold text-xl tracking-tight text-white">
            OneOps
            <span className="ml-2 text-xs font-normal text-white/80">
              Workspace
            </span>
          </span>
        </Link>
        <div className="global-search">
          <Icon name="search" size={16} />
          <input
            aria-label="Tìm kiếm chức năng"
            placeholder="Tìm kiếm chức năng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearch("");
            }}
          />
          {search && (
            <>
              <button
                className="icon-button"
                aria-label="Xóa tìm kiếm chức năng"
                onClick={() => setSearch("")}
              >
                <Icon name="close" size={14} />
              </button>
              <div className="search-results">
                {"thư viện ui design system tailwind".includes(
                  search.toLocaleLowerCase("vi"),
                ) && (
                  <Link href="/design-system" onClick={() => setSearch("")}>
                    Thư viện UI
                    <Icon name="chevron" size={16} />
                  </Link>
                )}
                {modules
                  .filter(
                    (m) =>
                      m.label
                        .toLocaleLowerCase("vi")
                        .includes(search.toLocaleLowerCase("vi")) ||
                      m.title
                        .toLocaleLowerCase("vi")
                        .includes(search.toLocaleLowerCase("vi")),
                  )
                  .map((m) => (
                    <Link
                      href={`/${m.id}`}
                      key={m.id}
                      onClick={() => {
                        setSearch("");
                        setMobileOpen(false);
                      }}
                    >
                      {m.label}
                      <Icon name="chevron" size={16} />
                    </Link>
                  ))}
                {!modules.some((m) =>
                  `${m.label} ${m.title}`
                    .toLocaleLowerCase("vi")
                    .includes(search.toLocaleLowerCase("vi")),
                ) && <p>Không tìm thấy chức năng</p>}
              </div>
            </>
          )}
        </div>
        <div className="account-actions">
          <img
            className="flag"
            src={vi.src}
            alt="Tiếng Việt"
            width={28}
            height={20}
          />
          <button
            className="avatar"
            aria-label="Thông tin phiên làm việc"
            aria-expanded={account}
            onClick={() => setAccount(!account)}
          >
            <span
              aria-hidden="true"
              className="text-xs font-semibold text-primary"
            >
              OP
            </span>
          </button>
          {account && (
            <div className="account-popover">
              <AccountSessionSummary />
              <div className="mb-4">
                <AppearanceControls />
              </div>
              <Link
                href="/design-system"
                className="mb-4 flex items-center gap-2 text-sm text-primary"
                onClick={() => setAccount(false)}
              >
                <Palette className="size-4" />
                Thư viện UI
              </Link>
              <Link
                href="/design-tokens"
                className="mb-4 flex items-center gap-2 text-sm text-primary"
                onClick={() => setAccount(false)}
              >
                <Palette className="size-4" />
                Design tokens
              </Link>
              <Button variant="secondary" onClick={() => setAccount(false)}>
                Đóng
              </Button>
            </div>
          )}
        </div>
      </header>
      <div className="app-body">
        {mobileOpen && (
          <button
            className="mobile-backdrop"
            aria-label="Đóng điều hướng"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={`sidebar ${hasSections && !collapsed ? "expanded" : ""} ${mobileOpen ? "mobile-open" : ""}`}
          aria-label="Điều hướng hệ thống"
        >
          <div className="create-wrap">
            <button
              className="create-button"
              onClick={openCreate}
              aria-label="Tạo mới"
            >
              <Icon name="plus" size={24} />
              {hasSections && !collapsed && <span>Tạo mới</span>}
            </button>
          </div>
          <div className="sidebar-content">
            <nav className="nav-rail" aria-label="Phân hệ">
              {modules.map((m) => (
                <Link
                  key={m.id}
                  href={`/${m.id}`}
                  aria-current={
                    !isLibrary && m.id === config.id ? "page" : undefined
                  }
                  className={`nav-item ${!isLibrary && m.id === config.id ? "active" : ""}`}
                  title={m.label}
                  onClick={() => setMobileOpen(false)}
                >
                  <img
                    src={navigationIcons[m.icon].src}
                    width={24}
                    height={24}
                    alt=""
                  />
                  <span>{m.label}</span>
                </Link>
              ))}
              <Link
                href="/design-system"
                className={`nav-item ${isLibrary ? "active" : ""}`}
                title="Thư viện UI"
                aria-current={isLibrary ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <BookOpen className="size-5" />
                <span>Thư viện UI</span>
              </Link>
            </nav>
            {hasSections && !collapsed && (
              <nav className="subnav" aria-label={submenuTitle}>
                <h2>{submenuTitle}</h2>
                <div className="subnav-items">
                  {config.navigation.items.map((item, i) => (
                    <Link
                      href={item.href}
                      key={`${item.label}-${i}`}
                      className={section === item.label ? "selected" : ""}
                      aria-current={section === item.label ? "true" : undefined}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>
            )}
          </div>
          {hasSections && (
            <button
              className="collapse-button"
              aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
              onClick={() =>
                setMenuState({ ...menuState, [config.id]: !collapsed })
              }
            >
              <span className={collapsed ? "" : "rotate"}>
                <Icon name="chevron" size={16} />
              </span>
              {!collapsed && "Thu gọn menu"}
            </button>
          )}
        </aside>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </>
  );
}
