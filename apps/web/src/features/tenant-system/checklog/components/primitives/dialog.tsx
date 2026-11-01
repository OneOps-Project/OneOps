"use client";
import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  returnFocus,
}: {
  open: boolean;
  onClose(): void;
  title: string;
  description?: string;
  children: ReactNode;
  returnFocus?: () => void;
}) {
  return (
    <Primitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--overlay)]" />
        <Primitive.Content
          onCloseAutoFocus={(event) => {
            if (returnFocus) {
              event.preventDefault();
              returnFocus();
            }
          }}
          className="fixed top-1/2 left-1/2 z-[var(--z-dialog)] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-border bg-surface p-6 text-foreground shadow-floating"
        >
          <Primitive.Title className="pr-10 text-lg font-semibold">
            {title}
          </Primitive.Title>
          <Primitive.Description
            className={
              description ? "mt-2 text-sm text-muted-foreground" : "sr-only"
            }
          >
            {description || title}
          </Primitive.Description>
          <Primitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              aria-label="Đóng hộp thoại"
            >
              <X />
            </Button>
          </Primitive.Close>
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
