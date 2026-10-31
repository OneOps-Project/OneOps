"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuditDetail } from "@/features/tenant-system/checklog/components/detail";
import { Button } from "@/features/tenant-system/checklog/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/tenant-system/checklog/components/primitives/forms";
import { Badge } from "@/features/tenant-system/checklog/components/primitives/foundations";
import {
  actionLabel,
  definition,
  messages,
  roleLabels,
  resultLabels,
  resultVariants,
} from "@/features/tenant-system/checklog/constants";
import { useChecklog } from "@/features/tenant-system/checklog/hooks/use-checklog";
import type {
  AuditEntry,
  AuditResult,
  ListQuery,
} from "@/features/tenant-system/checklog/types";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const isResult = (value: string | null): value is AuditResult =>
  value === "SUCCESS" || value === "DENIED" || value === "FAILED";

export function ModulePage() {
  const params = useSearchParams();
  const action = params.get("action") ?? "";
  const feature = params.get("feature") ?? "";
  const override = params.get("override");
  const result = params.get("result");
  const initial: Partial<ListQuery> = {
    action,
    feature,
    result: isResult(result) ? result : "",
    override:
      override === "true" ? "true" : override === "false" ? "false" : "",
  };
  const {
    query,
    search,
    setSearch,
    items,
    total,
    facets,
    loading,
    denied,
    error,
    filter,
    reset,
    goTo,
    reload,
  } = useChecklog(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(total / query.pageSize));
  const first = total ? (query.page - 1) * query.pageSize + 1 : 0;
  const last = Math.min(query.page * query.pageSize, total);
  const filtered =
    Boolean(query.q) ||
    Boolean(query.feature) ||
    Boolean(query.action) ||
    Boolean(query.actor) ||
    Boolean(query.result) ||
    Boolean(query.override) ||
    Boolean(query.from) ||
    Boolean(query.to);

  const resultBadge = (entry: AuditEntry) => (
    <span className="flex flex-wrap items-center gap-1">
      <Badge variant={resultVariants[entry.result]} dot>
        {resultLabels[entry.result]}
      </Badge>
      {entry.isOutOfScopeOverride && (
        <Badge variant="warning">Ngoài phạm vi</Badge>
      )}
    </span>
  );

  const actor = (entry: AuditEntry) => (
    <span className="flex flex-col">
      <span className="font-medium text-foreground">
        {entry.actorName || "—"}
      </span>
      <span className="text-xs text-muted-foreground">
        {roleLabels[entry.actorRole] ?? entry.actorRole}
        {entry.isSystemAdmin ? " · quản trị hệ thống" : ""}
      </span>
    </span>
  );

  if (denied)
    return (
      <div className="module-view">
        <section className="records-panel">
          <h1>{definition.title}</h1>
          <div role="alert" className="error">
            {messages.denied}
          </div>
          <p className="text-sm text-muted-foreground">
            Nhật ký ghi lại thao tác quản trị và thay đổi cấu hình. Liên hệ quản
            trị hệ thống nếu bạn cần quyền xem.
          </p>
        </section>
      </div>
    );

  return (
    <div className="module-view">
      <section className="records-panel">
        <div className="page-header">
          <div>
            <span className="eyebrow">Hệ thống · Nhật ký</span>
            <h1>{definition.title}</h1>
            <p>
              Mọi thao tác quản trị, thay đổi cấu hình và vượt phạm vi đều được
              ghi lại cùng người thực hiện, thời điểm và giá trị trước/sau.
            </p>
          </div>
          <div className="page-actions">
            <Badge variant="neutral" dot>
              Chỉ ghi thêm
            </Badge>
          </div>
        </div>

        <dl className="metric-strip">
          <div className="metric">
            <dt>Bản ghi</dt>
            <dd>{total}</dd>
          </div>
          <div className="metric">
            <dt>Chức năng có ghi nhận</dt>
            <dd>{facets.features.length}</dd>
          </div>
          <div className="metric">
            <dt>Loại thao tác</dt>
            <dd>{facets.actions.length}</dd>
          </div>
        </dl>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Tìm kiếm
            <Input
              aria-label="Tìm trong nhật ký"
              placeholder="Nội dung, người thực hiện, đối tượng…"
              value={search}
              maxLength={200}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Chức năng
            <Select
              aria-label="Lọc theo chức năng"
              value={query.feature}
              onChange={(event) => filter({ feature: event.target.value })}
            >
              <option value="">Tất cả chức năng</option>
              {facets.features.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.key} ({item.count})
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Thao tác
            <Select
              aria-label="Lọc theo thao tác"
              value={query.action}
              onChange={(event) => filter({ action: event.target.value })}
            >
              <option value="">Tất cả thao tác</option>
              {facets.actions.map((item) => (
                <option key={item.key} value={item.key}>
                  {actionLabel(item.key)} ({item.count})
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Kết quả
            <Select
              aria-label="Lọc theo kết quả"
              value={query.result}
              onChange={(event) =>
                filter({ result: event.target.value as AuditResult | "" })
              }
            >
              <option value="">Mọi kết quả</option>
              {(Object.keys(resultLabels) as AuditResult[]).map((value) => (
                <option key={value} value={value}>
                  {resultLabels[value]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Phạm vi
            <Select
              aria-label="Lọc theo phạm vi"
              value={query.override}
              onChange={(event) =>
                filter({
                  override: event.target.value as ListQuery["override"],
                })
              }
            >
              <option value="">Mọi phạm vi</option>
              <option value="false">Trong phạm vi</option>
              <option value="true">Vượt phạm vi</option>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Từ ngày
            <Input
              type="date"
              aria-label="Từ ngày"
              value={query.from}
              onChange={(event) => filter({ from: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Đến ngày
            <Input
              type="date"
              aria-label="Đến ngày"
              value={query.to}
              onChange={(event) => filter({ to: event.target.value })}
            />
          </label>
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={reset}
              disabled={!filtered && !search}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>

        {error && !denied && (
          <div role="alert" className="error">
            {error}
            <Button variant="ghost" onClick={reload}>
              Thử lại
            </Button>
          </div>
        )}

        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải nhật ký…
          </p>
        ) : !items.length ? (
          <div className="rounded-panel border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">
              {filtered ? messages.filtered : messages.empty}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filtered
                ? "Xóa hoặc đổi điều kiện lọc để xem lại."
                : "Bản ghi xuất hiện ngay sau thao tác đầu tiên được ghi nhận."}
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2 sm:hidden">
              {items.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(entry.createdAt)}
                    </span>
                    {resultBadge(entry)}
                  </div>
                  <p className="font-semibold text-foreground">
                    {entry.summary}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {actionLabel(entry.action)} · {entry.featureKey}
                  </p>
                  {actor(entry)}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelected(entry.id)}
                  >
                    Xem chi tiết
                  </Button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Nhật ký hệ thống, mới nhất trước
                </caption>
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th scope="col" className="px-2 py-2 font-medium">
                      Thời điểm
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Người thực hiện
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Thao tác
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Nội dung
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Kết quả
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      <span className="sr-only">Chi tiết</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="px-2 py-3 align-top text-xs whitespace-nowrap text-muted-foreground">
                        {formatTime(entry.createdAt)}
                      </td>
                      <td className="px-2 py-3 align-top">{actor(entry)}</td>
                      <td className="px-2 py-3 align-top">
                        <span className="block font-medium">
                          {actionLabel(entry.action)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {entry.featureKey}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className="block text-foreground">
                          {entry.summary}
                        </span>
                        {entry.targetId && (
                          <span className="block text-xs text-muted-foreground">
                            {entry.targetType} · {entry.targetId}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 align-top">
                        {resultBadge(entry)}
                      </td>
                      <td className="px-2 py-3 align-top text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelected(entry.id)}
                        >
                          Xem
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {first}–{last} trên {total} bản ghi
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goTo(query.page - 1)}
                  disabled={query.page <= 1 || loading}
                >
                  Trang trước
                </Button>
                <span className="text-sm text-muted-foreground">
                  Trang {query.page} / {pages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goTo(query.page + 1)}
                  disabled={query.page >= pages || loading}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">{messages.immutable}</p>
      </section>

      <AuditDetail id={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
