"use client";
import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/features/hr-management/organization/positions-grades/components/primitives/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap",
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

