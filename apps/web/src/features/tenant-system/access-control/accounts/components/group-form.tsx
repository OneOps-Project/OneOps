"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { accountsApi } from "../api/client";
import type { Account, AccountGroup } from "../types";
import { Button } from "./primitives/button";
import { Input, Select, Textarea } from "./primitives/forms";
import styles from "./styles.module.css";
export function GroupForm({
  group,
  onSaved,
  onClose,
}: {
  group?: AccountGroup;
  onSaved(message: string): void;
  onClose(): void;
}) {
  const [name, setName] = useState(group?.name || "");
  const [directory, setDirectory] = useState(group?.directory || "");
  const [description, setDescription] = useState(group?.description || "");
  const [ownerId, setOwnerId] = useState(group?.ownerId || "");
  const [members, setMembers] = useState<string[]>(
    group?.members.map((member) => member.accountId) || [],
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void accountsApi
        .list(
          new URLSearchParams({ page: "1", pageSize: "100", q: query }),
          controller.signal,
        )
        .then((data) => setAccounts(data.items))
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const choices = [
    ...new Map(
      [...(group?.members.map((m) => m.account) || []), ...accounts].map(
        (account) => [account.id, account],
      ),
    ).values(),
  ];
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const input = { name, directory, description, ownerId, memberIds: members };
    try {
      if (group)
        await accountsApi.updateGroup(group.id, {
          ...input,
          version: group.version,
        });
      else await accountsApi.createGroup(input);
      onSaved(group ? "Đã cập nhật nhóm tài khoản." : "Đã tạo nhóm tài khoản.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được nhóm.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className={styles.form}>
      <label className={styles.field}>
        Tên nhóm
        <Input
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        Directory
        <Input
          required
          aria-label="Directory"
          pattern="[a-z0-9][a-z0-9-]{1,63}"
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
          disabled={busy}
        />
        <span className="text-xs text-muted-foreground">
          Định danh duy nhất, ví dụ: ban-giam-doc.
        </span>
      </label>
      <label className={styles.field}>
        Giới thiệu
        <Textarea
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        Tìm tài khoản
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tên, email hoặc mã nhân viên"
        />
      </label>
      <label className={styles.field}>
        Người sở hữu
        <Select
          required
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          disabled={busy}
        >
          <option value="">Chọn người sở hữu</option>
          {choices.map((account) => (
            <option key={account.id} value={account.id}>
              {account.displayName} (@{account.username})
            </option>
          ))}
        </Select>
      </label>
      <fieldset className="max-h-48 space-y-2 overflow-y-auto rounded-control border border-border p-3">
        <legend className="text-sm">
          Thành viên (
          {new Set([...members, ...(ownerId ? [ownerId] : [])]).size})
        </legend>
        {choices.map((account) => (
          <label key={account.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={account.id === ownerId || members.includes(account.id)}
              disabled={busy || account.id === ownerId}
              onChange={(e) =>
                setMembers((previous) =>
                  e.target.checked
                    ? [...previous, account.id]
                    : previous.filter((id) => id !== account.id),
                )
              }
            />
            {account.displayName} (@{account.username})
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Người sở hữu luôn thuộc nhóm. Group là nhóm tài khoản, không phải phòng
        ban.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Hủy
        </Button>
        <Button type="submit" loading={busy}>
          Lưu nhóm
        </Button>
      </div>
    </form>
  );
}
