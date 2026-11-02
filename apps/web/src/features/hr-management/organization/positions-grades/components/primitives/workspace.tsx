"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Icon } from "@/features/hr-management/organization/positions-grades/components/primitives/icon";
import { Modal } from "@/features/hr-management/organization/positions-grades/components/primitives/overlays";

type Context = {
  openCreate: (defaultScope?: "job_title" | "designation" | "grade") => void;
  notify: (message: string) => void;
  createScope?: "job_title" | "designation" | "grade";
};

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
  renderCreate: (
    close: () => void,
    scope?: "job_title" | "designation" | "grade",
  ) => React.ReactNode;
  onNotify?: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [createScope, setCreateScope] = useState<
    "job_title" | "designation" | "grade" | undefined
  >(undefined);
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

  const openCreate = useCallback(
    (scope?: "job_title" | "designation" | "grade") => {
      setCreateScope(scope);
      setCreating(true);
    },
    [],
  );

  return (
    <WorkspaceContext.Provider value={{ openCreate, notify, createScope }}>
      {children}
      {creating && renderCreate(() => setCreating(false), createScope)}
      {message && (
        <div
          className="fixed bottom-6 right-6 z-[1000] flex items-center gap-3 rounded-control border border-border bg-surface px-4 py-3 text-sm text-foreground shadow-modal animate-in fade-in slide-in-from-bottom-4"
          role="status"
        >
          <span>{message}</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setMessage("")}
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </WorkspaceContext.Provider>
  );
}

export { Modal };
