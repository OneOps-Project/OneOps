"use client";
import type { ComponentProps, ReactNode } from "react";
import {
  Dialog as DialogPrimitive,
  AlertDialog as AlertDialogPrimitive,
  DropdownMenu as DropdownPrimitive,
  Popover as PopoverPrimitive,
} from "radix-ui";
import { X, Check } from "lucide-react";
import { cn } from "@/core/ui/design-system/lib/utils";
import {
  Button,
  buttonVariants,
} from "@/core/ui/design-system/ui/primitives/button";

export const Dialog = DialogPrimitive.Root;

export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogClose = DialogPrimitive.Close;

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

export function DialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-wrap justify-end gap-3 border-t border-border px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "Xác nhận",
  destructive = false,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <AlertDialogPrimitive.Root>
      <AlertDialogPrimitive.Trigger asChild>
        {trigger}
      </AlertDialogPrimitive.Trigger>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-foreground/35 backdrop-blur-xs" />
        <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-panel border border-border bg-surface p-6 shadow-floating">
          <AlertDialogPrimitive.Title className="text-lg font-semibold">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialogPrimitive.Cancel
              className={buttonVariants({ variant: "secondary" })}
            >
              Hủy
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              onClick={onConfirm}
              className={buttonVariants({
                variant: destructive ? "destructive" : "primary",
              })}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

export const DropdownMenu = DropdownPrimitive.Root;

export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "z-[110] min-w-48 animate-enter rounded-control border border-border bg-elevated p-1.5 text-foreground shadow-floating",
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: ComponentProps<typeof DropdownPrimitive.Item> & { destructive?: boolean }) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-muted [&_svg]:size-4",
        destructive ? "text-destructive" : "text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof DropdownPrimitive.CheckboxItem>) {
  return (
    <DropdownPrimitive.CheckboxItem
      checked={checked}
      className={cn(
        "relative cursor-pointer rounded-md py-2 pr-3 pl-9 text-sm outline-none data-[highlighted]:bg-muted",
        className,
      )}
      {...props}
    >
      <DropdownPrimitive.ItemIndicator className="absolute top-2.5 left-3">
        <Check className="size-3.5" />
      </DropdownPrimitive.ItemIndicator>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-border" />;
}

export const Popover = PopoverPrimitive.Root;

export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({
  className,
  sideOffset = 7,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={16}
        className={cn(
          "z-[110] w-72 animate-enter rounded-panel border border-border bg-elevated p-4 text-foreground shadow-floating outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
