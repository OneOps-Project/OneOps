"use client";
import type { ComponentProps } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/features/hr-management/organization/positions-grades/components/primitives/utils";
import { Button } from "@/features/hr-management/organization/positions-grades/components/primitives/button";

export const Dialog = DialogPrimitive.Root;

export function DialogContent({
  title,
  description,
  children,
  className,
  sheet = false,
  ...props
}: Omit<ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  title: string;
  description?: string;
  sheet?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-foreground/35 backdrop-blur-xs" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-[101] flex flex-col overflow-auto border border-glass-border bg-glass text-foreground shadow-glass backdrop-blur-glass outline-none",
          sheet
            ? "inset-y-0 right-0 w-full max-w-md border-y-0 border-r-0"
            : "top-1/2 left-1/2 max-h-[calc(100dvh-3rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-panel",
          className,
        )}
        {...props}
      >
        <div className="border-b border-border p-6 pr-14">
          <DialogPrimitive.Title className="text-lg leading-7 font-semibold tracking-tight">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">
              {title}
            </DialogPrimitive.Description>
          )}
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Đóng hộp thoại"
              className="absolute top-4 right-4 size-8"
            >
              <X />
            </Button>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
