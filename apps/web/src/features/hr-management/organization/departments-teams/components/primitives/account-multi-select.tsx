"use client";

import { useEffect, useRef, useState } from "react";
// TODO: [INTEGRATION] - Replace the mock Accounts list with Accounts API data.
import {
  accountOptions,
  type MockAccount,
} from "@/features/hr-management/organization/departments-teams/api/mock-accounts";
import styles from "@/features/hr-management/organization/departments-teams/components/styles.module.css";

export function AccountMultiSelect({
  id,
  label,
  accounts,
  required = false,
  selectedIds,
  onChange,
}: {
  id: string;
  label: string;
  accounts: MockAccount[];
  required?: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const options = accountOptions(accounts, selectedIds);

  const filtered = options.filter((account) =>
    account.name
      .toLocaleLowerCase("vi")
      .includes(query.toLocaleLowerCase("vi")),
  );
  const selectedAccounts = options.filter((account) =>
    selectedIds.includes(account.id),
  );

  useEffect(() => {
    searchRef.current?.setCustomValidity(
      required && selectedIds.length === 0
        ? `Vui lòng chọn ít nhất một mục trong ${label.toLocaleLowerCase("vi")}.`
        : "",
    );
  }, [label, required, selectedIds]);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !pickerRef.current?.contains(event.target)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function toggleAccount(account: MockAccount) {
    onChange(
      selectedIds.includes(account.id)
        ? selectedIds.filter((id) => id !== account.id)
        : [...selectedIds, account.id],
    );
  }

  return (
    <div className={styles.field}>
      <label htmlFor={`${id}-search`}>{label}</label>
      <div
        ref={pickerRef}
        className={styles.accountPicker}
        onBlur={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setOpen(false);
            setQuery("");
          }
        }}
      >
        <div className={styles.accountSearchBox}>
          {selectedAccounts.map((account) => (
            <span className={styles.accountChip} key={account.id}>
              {account.name}
              <button
                type="button"
                aria-label={`Bỏ chọn ${account.name}`}
                onClick={() =>
                  onChange(selectedIds.filter((id) => id !== account.id))
                }
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={searchRef}
            id={`${id}-search`}
            className={`${styles.input} ${styles.accountSearch}`}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            aria-haspopup="listbox"
            aria-required={required || undefined}
            placeholder={
              selectedAccounts.length
                ? "Tìm thêm…"
                : `Tìm ${label.toLocaleLowerCase("vi")}`
            }
            value={query}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setQuery("");
              } else if (event.key === "ArrowDown" && open) {
                event.preventDefault();
                pickerRef.current
                  ?.querySelector<HTMLButtonElement>('[role="option"]')
                  ?.focus();
              } else if (event.key === "Enter" && open) {
                event.preventDefault();
              }
            }}
          />
        </div>
        {open && (
          <div
            id={`${id}-options`}
            className={styles.accountOptions}
            role="listbox"
            aria-multiselectable="true"
            aria-label={label}
            onKeyDown={(event) => {
              const options = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="option"]',
                ),
              );
              const currentIndex = options.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              let nextIndex = -1;
              if (options.length > 0) {
                if (event.key === "ArrowDown") {
                  nextIndex =
                    currentIndex < 0 ? 0 : (currentIndex + 1) % options.length;
                } else if (event.key === "ArrowUp") {
                  nextIndex =
                    currentIndex < 0
                      ? options.length - 1
                      : (currentIndex - 1 + options.length) % options.length;
                } else if (event.key === "Home") {
                  nextIndex = 0;
                } else if (event.key === "End") {
                  nextIndex = options.length - 1;
                }
              }
              if (nextIndex >= 0) {
                event.preventDefault();
                options[nextIndex]?.focus();
              }
            }}
          >
            {filtered.length ? (
              filtered.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  role="option"
                  aria-selected={selectedIds.includes(account.id)}
                  className={styles.accountOption}
                  onClick={() => toggleAccount(account)}
                >
                  <span className={styles.accountCheckbox} aria-hidden="true" />
                  <span>{account.name}</span>
                </button>
              ))
            ) : (
              <p className={styles.accountEmpty}>
                Không tìm thấy lựa chọn phù hợp.
              </p>
            )}
          </div>
        )}
      </div>
      <small>
        Chọn một hoặc nhiều mục. Nguồn danh sách hiện là mock cho tới khi
        Accounts được tích hợp.
      </small>
    </div>
  );
}
