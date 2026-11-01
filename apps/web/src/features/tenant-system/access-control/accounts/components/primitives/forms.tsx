"use client";
import { type ComponentProps } from "react";
import { cn } from "@/features/tenant-system/access-control/accounts/components/primitives/utils";

export const inputStyles =
  "flex h-[var(--input-height)] w-full min-w-0 rounded-control border border-input bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        inputStyles,
        "h-auto min-h-24 resize-y leading-6",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={cn(inputStyles, "cursor-pointer pr-8", className)}
      {...props}
    >
      {children}
    </select>
  );
}
