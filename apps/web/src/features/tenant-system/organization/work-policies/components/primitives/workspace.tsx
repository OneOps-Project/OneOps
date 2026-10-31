"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Icon } from "@/features/tenant-system/organization/work-policies/components/primitives/icon";
import {
  Dialog,
  DialogContent,
} from "@/features/tenant-system/organization/work-policies/components/primitives/overlays";
import { cn } from "@/features/tenant-system/organization/work-policies/components/primitives/utils";

type Context = { openCreate: () => void; notify: (message: string) => void };

const WorkspaceContext = createContext<Context | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("WorkspaceProvider required");
  return context;
}

export function WorkspaceProvider({
  children,
  renderCreate,
  onNotify,
}: {
  children: React.ReactNode;
  renderCreate: (close: () => void) => React.ReactNode;
  onNotify?: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const notify = useCallback(
    (text: string) => {
      if (onNotify) onNotify(text);
      else setMessage(text);
    },
    [onNotify],
  );
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <WorkspaceContext.Provider
      value={{ openCreate: () => setCreating(true), notify }}
    >
      {children}
      {creating && renderCreate(() => setCreating(false))}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Đóng thông báo" onClick={() => setMessage("")}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </WorkspaceContext.Provider>
  );
}

export function Modal({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const trigger = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        title={title}
        className={cn("modal", className)}
        onOpenAutoFocus={() => {
          trigger.current = document.activeElement as HTMLElement;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus();
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
