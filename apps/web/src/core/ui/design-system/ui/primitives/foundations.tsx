"use client";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import {
  Avatar as AvatarPrimitive,
  Progress as ProgressPrimitive,
  Separator as SeparatorPrimitive,
  Tooltip as TooltipPrimitive,
} from "radix-ui";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Inbox,
  LoaderCircle,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/core/ui/design-system/lib/utils";
import { Button } from "@/core/ui/design-system/ui/primitives/button";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-muted-foreground",
        brand: "border-primary/15 bg-accent text-accent-foreground",
        success: "border-success/15 bg-success-soft text-success",
        warning: "border-warning/15 bg-warning-soft text-warning",
        danger: "border-destructive/15 bg-destructive-soft text-destructive",
        info: "border-info/15 bg-info-soft text-info",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  dot,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-glass-border bg-glass text-foreground shadow-glass backdrop-blur-glass",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 p-[var(--panel-space)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base leading-6 font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-[var(--panel-space)] pb-[var(--panel-space)]",
        className,
      )}
      {...props}
    />
  );
}

const alertTones = {
  info: "border-info/20 bg-info-soft text-info",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
  danger: "border-destructive/20 bg-destructive-soft text-destructive",
};

const alertIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof alertTones;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = alertIcons[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-control border p-4",
        alertTones[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {children && (
          <div className="mt-1 text-sm leading-6 opacity-90">{children}</div>
        )}
      </div>
      {action}
    </div>
  );
}

export function Separator({
  className,
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-skeleton rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({
  className,
  label = "Đang tải",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
    >
      <LoaderCircle
        className={cn(
          "size-4 animate-spin motion-reduce:animate-none",
          className,
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Progress({
  value = 0,
  className,
  label = "Tiến độ",
}: {
  value?: number;
  className?: string;
  label?: string;
}) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <ProgressPrimitive.Root
      value={safe}
      aria-label={label}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full rounded-full bg-primary transition-transform motion-reduce:transition-none"
        style={{ transform: `translateX(-${100 - safe}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function Avatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string;
  alt: string;
  fallback: string;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-accent text-xs font-semibold text-accent-foreground",
        className,
      )}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={alt}
          className="size-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback delayMs={src ? 300 : 0} aria-label={alt}>
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function Tooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={7}
            className="z-[120] max-w-64 animate-enter rounded-md bg-foreground px-3 py-2 text-xs leading-5 text-surface shadow-floating"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-foreground" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export function EmptyState({
  title = "Chưa có dữ liệu",
  description = "Tạo bản ghi đầu tiên để bắt đầu quản lý.",
  action,
  icon,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border bg-background text-subtle-foreground">
        {icon || <Inbox className="size-6" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Đường dẫn">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="inline-flex items-center gap-2">
            {i > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
            {item.href ? (
              <a
                href={item.href}
                className="hover:text-primary hover:underline"
              >
                {item.label}
              </a>
            ) : (
              <span
                aria-current={i === items.length - 1 ? "page" : undefined}
                className={
                  i === items.length - 1 ? "font-medium text-foreground" : ""
                }
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const total = Math.max(1, totalPages);
  const items = Array.from(
    new Set(
      [1, page - 1, page, page + 1, total].filter((p) => p > 0 && p <= total),
    ),
  ).sort((a, b) => a - b);
  return (
    <nav aria-label="Phân trang" className="flex items-center gap-1">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronRight className="rotate-180" />
      </Button>
      {items.map((p, i) => (
        <span key={p} className="inline-flex items-center gap-1">
          {i > 0 && p - items[i - 1] > 1 && (
            <MoreHorizontal className="mx-1 size-4 text-muted-foreground" />
          )}
          <Button
            size="sm"
            variant={p === page ? "soft" : "ghost"}
            aria-label={`Trang ${p}`}
            aria-current={p === page ? "page" : undefined}
            className="min-w-8"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        </span>
      ))}
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
