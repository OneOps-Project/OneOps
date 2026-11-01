"use client";
import { AccountForm } from "./account-form";
export function CreateForm({
  onClose,
  onNotify,
}: {
  onClose(): void;
  onNotify?: (message: string) => void;
}) {
  return (
    <div className="px-6 pb-6">
      <AccountForm
        onClose={onClose}
        onSaved={(message) => {
          onNotify?.(message);
          window.dispatchEvent(new Event("oneops-accounts-changed"));
          onClose();
        }}
      />
    </div>
  );
}
