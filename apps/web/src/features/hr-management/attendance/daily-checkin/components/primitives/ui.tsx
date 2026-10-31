"use client";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonStyles = {
  base: "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-45",
  variant: {
    primary:
      "btn-gradient bg-primary text-primary-foreground hover:bg-primary-hover",
    secondary: "border border-border bg-surface text-foreground hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    destructive:
      "bg-destructive text-white hover:opacity-90 dark:text-background",
  },
  size: { sm: "h-8 px-3 text-xs", md: "h-[var(--button-height)] px-4" },
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  variant?: keyof typeof buttonStyles.variant;
  size?: keyof typeof buttonStyles.size;
}) {
  return (
    <button
      type={type}
      className={cn(
        buttonStyles.base,
        buttonStyles.variant[variant],
        buttonStyles.size[size],
        className,
      )}
      {...props}
    />
  );
}

export const inputStyles =
  "flex h-[var(--input-height)] w-full min-w-0 rounded-control border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        inputStyles,
        "h-auto min-h-20 resize-y leading-6",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(inputStyles, "cursor-pointer pr-8", className)}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  const tones = {
    neutral: "border-border bg-muted text-muted-foreground",
    success: "border-success/15 bg-success-soft text-success",
    warning: "border-warning/15 bg-warning-soft text-warning",
    danger: "border-destructive/15 bg-destructive-soft text-destructive",
    info: "border-info/15 bg-info-soft text-info",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && (
        <span className="text-xs text-muted-foreground">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[calc(100dvh-3rem)] w-full max-w-lg flex-col overflow-auto rounded-card border border-glass-border bg-glass p-6 text-foreground shadow-glass backdrop-blur-glass"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg leading-7 font-semibold tracking-tight">
            {title}
          </h2>
          <Button
            ref={close}
            variant="ghost"
            size="sm"
            aria-label="Đóng hộp thoại"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function ErrorLine({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="error">
      {message}
      {retry && (
        <Button variant="ghost" size="sm" onClick={retry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
