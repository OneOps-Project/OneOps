"use client";

import Link from "next/link";
import { navigationIcons } from "@/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getModule, modules } from "@/core/config/feature-registry";
import { useWorkspace } from "@/core/ui/primitives/workspace";
import { Icon } from "@/core/ui/primitives/icon";
import { Button } from "@/core/ui/primitives/button";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Palette,
  PanelLeft,
  Plus,
  Search,
} from "lucide-react";
import { AppearanceControls } from "@/core/ui/primitives/preferences";
import { Onboarding, OnboardingTrigger } from "@/core/layout/onboarding";
import { NotificationBell } from "@/features/work-management/coordination/notifications";
import { useSession } from "@/features/tenant-system/access-control/tenant-auth/index";

const AUTH_ROUTE = "/tenant-system/auth";
const roleLabels = { EMPLOYEE: "Nhân viên", MANAGER: "Quản lý" } as const;
const systemLabels: Record<string, string> = {
  "work-management": "Công việc",
  "hr-management": "Nhân sự",
  "tenant-system": "Hệ thống",
  "": "Không gian làm việc",
};
const systemOf = (id: string) => systemLabels[id.split("/")[0]] ?? "OneOps";
/** Cấp 1 của điều hướng: bốn phân hệ, mỗi phân hệ trỏ tới chức năng mở đầu. */
const systems = [
  { id: "work-management", start: "work-management/tasks" },
  { id: "hr-management", start: "hr-management/employees" },
  { id: "tenant-system", start: "tenant-system/accounts" },
] as const;
const libraryLinks = [
  { href: "/design-system", label: "Thư viện UI" },
  { href: "/design-tokens", label: "Design tokens" },
];
const hrefOf = (id: string) => (id ? `/${id}` : "/");

/** Trạng thái khởi động: giữ nhận diện và báo đang xử lý thay vì để khung trắng. */
function ShellBoot({ label }: { label: string }) {
  return (
    <div className="boot-screen" aria-busy="true">
      <span className="boot-mark" aria-hidden="true" />
      <p className="boot-label">{label}</p>
      <span className="boot-track" aria-hidden="true">
        <span className="boot-bar" />
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellBoot label="Đang tải giao diện…" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { status, actor, signOut } = useSession();
  const params = useSearchParams();
  const isAuth = path === AUTH_ROUTE || path.startsWith(`${AUTH_ROUTE}/`);
  const mustChangePassword = Boolean(actor?.mustChangePassword);
  const signedIn = status === "ready" && !mustChangePassword;
  const config = getModule(path.replace(/^\/|\/$/g, "")) || modules[0];
  const isLibrary = path === "/design-system" || path === "/design-tokens";
  const isHome = !isLibrary && config.id === "";
  const systemId = isHome
    ? "work-management"
    : (config.id.split("/")[0] ?? "work-management");
  const features = isLibrary
    ? []
    : modules.filter(
        (item) => item.id !== "" && item.id.split("/")[0] === systemId,
      );
  const section =
    params.get("section") ||
    (params.get("scope") === "all" ? config.navigation.allSection : "") ||
    config.navigation.defaultSection;
  const { openCreate } = useWorkspace();
  const [menuState, setMenuState] = useState<Record<string, boolean>>({});
  const collapsed = menuState[config.id] ?? config.navigation.collapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [account, setAccount] = useState(false);
  const [tour, setTour] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const panelOpen = (isLibrary || features.length > 0) && !collapsed;
  // Trang tổng quan không thuộc phân hệ nào: panel mở danh sách của phân hệ gần nhất.
  const panelEyebrow = systemOf(isHome ? systemId : config.id);
  const panelTitle = isHome ? "" : config.navigation.title;

  // Phiên đăng nhập hỏng hoặc mật khẩu tạm thời luôn quay về trang xác thực.
  useEffect(() => {
    if (!isAuth && (status === "anon" || mustChangePassword))
      router.replace(AUTH_ROUTE);
  }, [isAuth, status, mustChangePassword, router]);

  // Ctrl/⌘ K mở bảng tìm kiếm chức năng; Escape đóng mọi lớp phủ đang mở.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === "Escape") {
        setAccount(false);
        setMobileOpen(false);
      }
    }
    function onTour() {
      setAccount(false);
      setTour(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("oneops:tour", onTour);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("oneops:tour", onTour);
    };
  }, []);

  const term = query.trim().toLocaleLowerCase("vi");
  const hits = useMemo(
    () =>
      !term
        ? []
        : [
            ...("thư viện ui design system tailwind".includes(term)
              ? [{ href: "/design-system", label: "Thư viện UI" }]
              : []),
            ...modules
              .filter((item) =>
                `${item.label} ${item.title}`
                  .toLocaleLowerCase("vi")
                  .includes(term),
              )
              .map((item) => ({ href: `/${item.id}`, label: item.label })),
          ],
    [term],
  );

  function openFirst() {
    const first = hits[0];
    if (!first) return;
    setQuery("");
    setMobileOpen(false);
    router.push(first.href);
  }

  function moveFocus(step: number) {
    const links = [
      ...(resultsRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []),
    ];
    if (!links.length) return;
    const index = links.findIndex((link) => link === document.activeElement);
    const next =
      index === -1 ? 0 : (index + step + links.length) % links.length;
    links[next].focus();
  }

  function toggleMenu() {
    if (window.innerWidth <= 800) setMobileOpen((open) => !open);
    else if (panelOpen || isLibrary || features.length > 0)
      setMenuState({ ...menuState, [config.id]: !collapsed });
    else searchRef.current?.focus();
  }

  if (isAuth) return <>{children}</>;
  if (!signedIn) return <ShellBoot label="Đang kiểm tra phiên đăng nhập…" />;

  return (
    <>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <header className="topbar">
        <button
          className="app-switch"
          type="button"
          aria-label={mobileOpen ? "Đóng điều hướng" : "Mở điều hướng"}
          aria-expanded={mobileOpen}
          onClick={toggleMenu}
        >
          <PanelLeft aria-hidden="true" size={18} />
        </button>
        <Link
          href="/"
          className="brand"
          aria-label="OneOps — Không gian làm việc"
        >
          <span>OneOps</span>
          <small>Workspace</small>
        </Link>
        <div className="global-search" data-tour="search">
          <Search aria-hidden="true" size={15} />
          <input
            ref={searchRef}
            aria-label="Tìm kiếm chức năng"
            placeholder="Tìm chức năng, màn hình…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                moveFocus(event.key === "ArrowDown" ? 1 : -1);
              }
              if (event.key === "Enter") openFirst();
            }}
          />
          {query ? (
            <button
              className="icon-button"
              type="button"
              aria-label="Xóa tìm kiếm chức năng"
              onClick={() => setQuery("")}
            >
              <Icon name="close" size={14} />
            </button>
          ) : (
            <kbd aria-hidden="true">Ctrl K</kbd>
          )}
          {query && (
            <div className="search-results" ref={resultsRef}>
              {hits.length ? (
                hits.map((hit) => (
                  <Link
                    href={hit.href}
                    key={`${hit.href}-${hit.label}`}
                    onClick={() => {
                      setQuery("");
                      setMobileOpen(false);
                    }}
                  >
                    {hit.label}
                    <Icon name="chevron" size={14} />
                  </Link>
                ))
              ) : (
                <p>Không tìm thấy chức năng “{query}”.</p>
              )}
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            {term
              ? hits.length
                ? `${hits.length} chức năng phù hợp`
                : "Không tìm thấy chức năng"
              : ""}
          </p>
        </div>
        <div className="account-actions">
          <OnboardingTrigger compact />
          <NotificationBell recipient={actor?.displayName ?? null} />
          <button
            className="avatar"
            type="button"
            aria-label="Thông tin phiên làm việc"
            aria-expanded={account}
            onClick={() => setAccount(!account)}
          >
            <span aria-hidden="true">
              {(actor?.displayName ?? "OP")
                .split(/\s+/)
                .filter(Boolean)
                .slice(-2)
                .map((part) => part[0])
                .join("")
                .toLocaleUpperCase("vi")}
            </span>
          </button>
          {account && (
            <div className="account-popover">
              <strong>{actor?.displayName}</strong>
              <p>
                {actor ? roleLabels[actor.role] : ""}
                {actor?.isSystemAdmin ? " · Quản trị hệ thống" : ""}
              </p>
              <div className="mb-3">
                <AppearanceControls />
              </div>
              <div className="mb-3">
                <OnboardingTrigger />
              </div>
              <Link
                href="/design-system"
                className="mb-2 flex items-center gap-2 text-sm text-primary"
                onClick={() => setAccount(false)}
              >
                <Palette className="size-4" aria-hidden="true" />
                Thư viện UI
              </Link>
              <Link
                href="/design-tokens"
                className="mb-4 flex items-center gap-2 text-sm text-primary"
                onClick={() => setAccount(false)}
              >
                <Palette className="size-4" aria-hidden="true" />
                Design tokens
              </Link>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    setAccount(false);
                    await signOut();
                    router.replace(AUTH_ROUTE);
                  }}
                >
                  <LogOut aria-hidden="true" />
                  Đăng xuất
                </Button>
                <Button variant="secondary" onClick={() => setAccount(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>
      <div className="app-body">
        {mobileOpen && (
          <button
            className="mobile-backdrop"
            type="button"
            aria-label="Đóng điều hướng"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={`sidebar ${panelOpen ? "expanded" : ""} ${mobileOpen ? "mobile-open" : ""}`}
          aria-label="Điều hướng hệ thống"
        >
          <div className="sidebar-content">
            <div className="rail-column">
              <div className="create-wrap">
                <button
                  className="create-button"
                  type="button"
                  onClick={openCreate}
                  aria-label="Tạo mới"
                  title="Tạo mới"
                  data-tour="create"
                >
                  <Plus aria-hidden="true" size={18} strokeWidth={2.25} />
                </button>
              </div>
              <nav className="nav-rail" aria-label="Phân hệ" data-tour="rail">
                <Link
                  href="/"
                  className={`nav-item ${isHome ? "active" : ""}`}
                  aria-current={isHome ? "page" : undefined}
                  title="Tổng quan · Không gian làm việc"
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard aria-hidden="true" size={20} />
                  <span>Tổng quan</span>
                </Link>
                <span className="nav-rule" aria-hidden="true" />
                {systems.map((system) => {
                  const start = getModule(system.start);
                  const active =
                    !isLibrary && !isHome && config.id
                      ? config.id.split("/")[0] === system.id
                      : false;
                  return (
                    <Link
                      key={system.id}
                      href={hrefOf(system.start)}
                      aria-current={active ? "page" : undefined}
                      className={`nav-item ${active ? "active" : ""}`}
                      title={`${systemLabels[system.id]} · ${start?.label ?? ""}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <img
                        src={navigationIcons[start?.icon ?? 1]?.src}
                        width={20}
                        height={20}
                        alt=""
                      />
                      <span>{systemLabels[system.id]}</span>
                    </Link>
                  );
                })}
                <Link
                  href="/design-system"
                  className={`nav-item ${isLibrary ? "active" : ""}`}
                  title="Thư viện UI · Thành phần và nguyên tắc giao diện"
                  aria-current={isLibrary ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <BookOpen aria-hidden="true" size={20} />
                  <span>Thư viện</span>
                </Link>
              </nav>
            </div>
            {panelOpen &&
              (isLibrary ? (
                <nav className="subnav" aria-label="Thư viện thiết kế">
                  <span className="subnav-eyebrow">Thư viện</span>
                  <h2>Thiết kế &amp; token</h2>
                  <div className="subnav-items">
                    {libraryLinks.map((link) => (
                      <Link
                        href={link.href}
                        key={link.href}
                        className={path === link.href ? "selected" : ""}
                        aria-current={path === link.href ? "true" : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </nav>
              ) : (
                <nav className="subnav" aria-label={panelTitle || panelEyebrow}>
                  {panelEyebrow !== panelTitle && (
                    <span className="subnav-eyebrow">{panelEyebrow}</span>
                  )}
                  {panelTitle && <h2>{panelTitle}</h2>}
                  <div className="subnav-items">
                    {features.map((item) => (
                      <Link
                        href={hrefOf(item.id)}
                        key={item.id}
                        className={item.id === config.id ? "selected" : ""}
                        aria-current={
                          item.id === config.id ? "true" : undefined
                        }
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  {config.navigation.items.length > 0 && (
                    <>
                      <span className="subnav-eyebrow subnav-divider">
                        Bộ lọc
                      </span>
                      <div className="subnav-items">
                        {config.navigation.items.map((item, index) => (
                          <Link
                            href={item.href}
                            key={`${item.label}-${index}`}
                            className={section === item.label ? "selected" : ""}
                            aria-current={
                              section === item.label ? "true" : undefined
                            }
                            onClick={() => setMobileOpen(false)}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </nav>
              ))}
          </div>
          {panelOpen && (
            <button
              className="collapse-button"
              type="button"
              aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
              aria-expanded={!collapsed}
              onClick={() =>
                setMenuState({ ...menuState, [config.id]: !collapsed })
              }
            >
              {collapsed ? (
                <ChevronsRight aria-hidden="true" size={15} />
              ) : (
                <ChevronsLeft aria-hidden="true" size={15} />
              )}
              {!collapsed && "Thu gọn menu"}
            </button>
          )}
        </aside>
        <main id="main-content" tabIndex={-1} data-tour="content">
          {children}
        </main>
      </div>
      <Onboarding
        key={`${path}-${tour}`}
        open={tour}
        onClose={() => setTour(false)}
      />
    </>
  );
}
