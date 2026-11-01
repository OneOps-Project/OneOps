"use client";
import { useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useChecklog } from "../hooks/use-checklog";
import { emptyFilters, type AuditFilters } from "../types";
import {
  actionLabel,
  entityLabel,
  moduleLabel,
  formatTime,
  resultLabels,
} from "../constants";
import { Input, Select } from "./primitives/forms";
import { Button } from "./primitives/button";
import { Dialog } from "./primitives/dialog";
import { EventDetail } from "./event-detail";
import styles from "./styles.module.css";
export function ChecklogPage() {
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const params = useSearchParams();
  const router = useRouter();
  const preset = params.get("result") || "";
  const [filters, setFilters] = useState<AuditFilters>({ ...emptyFilters });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const effective = useMemo(
    () => ({
      ...filters,
      result:
        params.get("result") &&
        ["SUCCESS", "FAILURE", "DENIED"].includes(preset)
          ? preset
          : filters.result,
    }),
    [filters, params, preset],
  );
  const state = useChecklog(effective, page);
  const { deny } = state;
  const onDenied = useCallback(() => {
    setSelected(null);
    deny();
  }, [deny]);
  function change(key: keyof AuditFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelected(null);
  }
  const dateError =
    effective.from && effective.to && effective.from > effective.to;
  if (state.denied)
    return (
      <section className={styles.page}>
        <div className={`${styles.panel} p-6`}>
          <ShieldCheck className="mb-4 size-8 text-primary" />
          <h1 className="text-xl font-semibold">
            Không có quyền xem nhật ký tập trung
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Chức năng hiện dành cho Quản trị cấp cao. Quyền quản trị tài khoản
            không tự cấp quyền xem nhật ký của toàn hệ thống.
          </p>
          <Button variant="secondary" className="mt-4" onClick={state.reload}>
            Kiểm tra lại quyền
          </Button>
        </div>
      </section>
    );
  const summary = state.data?.summary;
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className="mb-2 text-xs font-medium text-primary">
            QUẢN TRỊ HỆ THỐNG
          </p>
          <h1 className="text-2xl font-semibold">Nhật ký hệ thống</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tra cứu thao tác trên các module, xác định người thực hiện và xem
            thay đổi trước/sau.
          </p>
        </div>
        <Button variant="secondary" onClick={state.reload}>
          <RefreshCw />
          Làm mới
        </Button>
      </div>
      <div className="flex items-start gap-3 rounded-control border border-border bg-muted p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Nhật ký chỉ được tra cứu. Không có chức năng sửa hoặc xóa sự kiện.
          Thời gian hiển thị theo giờ Việt Nam.
        </p>
      </div>
      <section className={styles.summary} aria-label="Thống kê kết quả lọc">
        {[
          ["Tổng sự kiện", state.data?.total],
          ["Thành công", summary?.success],
          ["Thất bại", summary?.failure],
          ["Bị từ chối", summary?.denied],
        ].map(([label, count]) => (
          <div className={styles.stat} key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">
              {state.loading ? "…" : (count ?? "—")}
            </p>
          </div>
        ))}
      </section>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <label className={styles.field}>
            Tìm kiếm
            <Input
              value={filters.q}
              onChange={(e) => change("q", e.target.value)}
              placeholder="Người, hành động, tên hoặc ID đối tượng…"
              maxLength={200}
            />
          </label>
          <label className={styles.field}>
            Module
            <Select
              aria-label="Module"
              value={filters.module}
              onChange={(e) => change("module", e.target.value)}
            >
              <option value="">Tất cả module</option>
              {state.options.modules.map((value) => (
                <option key={value} value={value}>
                  {moduleLabel(value)}
                </option>
              ))}
            </Select>
          </label>
          <label className={styles.field}>
            Người thực hiện
            <Input
              value={filters.actor}
              onChange={(e) => change("actor", e.target.value)}
              placeholder="Tên đăng nhập hoặc ID"
              maxLength={200}
            />
          </label>
          <label className={styles.field}>
            Hành động
            <Select
              aria-label="Hành động"
              value={filters.action}
              onChange={(e) => change("action", e.target.value)}
            >
              <option value="">Tất cả hành động</option>
              {state.options.actions.map((value) => (
                <option key={value} value={value}>
                  {actionLabel(value)}
                </option>
              ))}
            </Select>
          </label>
          <label className={styles.field}>
            Loại đối tượng
            <Select
              aria-label="Loại đối tượng"
              value={filters.entityType}
              onChange={(e) => change("entityType", e.target.value)}
            >
              <option value="">Tất cả đối tượng</option>
              {state.options.entityTypes.map((value) => (
                <option key={value} value={value}>
                  {entityLabel(value)}
                </option>
              ))}
            </Select>
          </label>
          <label className={styles.field}>
            Kết quả
            <Select
              aria-label="Kết quả"
              value={effective.result}
              disabled={["SUCCESS", "FAILURE", "DENIED"].includes(preset)}
              onChange={(e) => change("result", e.target.value)}
            >
              <option value="">Tất cả kết quả</option>
              {Object.entries(resultLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className={styles.field}>
            ID đối tượng
            <Input
              value={filters.entityId}
              onChange={(e) => change("entityId", e.target.value)}
              placeholder="UUID của đối tượng"
              maxLength={36}
            />
          </label>
          <label className={styles.field}>
            Từ ngày
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => change("from", e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Đến ngày
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => change("to", e.target.value)}
              aria-invalid={!!dateError}
            />
          </label>
          <div className="flex items-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setFilters({ ...emptyFilters });
                setPage(1);
                setSelected(null);
                router.replace("/tenant-system/checklog");
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>
        {dateError && (
          <p role="alert" className="px-6 pt-4 text-sm text-destructive">
            Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.
          </p>
        )}
        {state.error ? (
          <div role="alert" className={styles.empty}>
            <p className="text-destructive">{state.error}</p>
            <Button variant="secondary" className="mt-3" onClick={state.reload}>
              Thử lại
            </Button>
          </div>
        ) : state.loading ? (
          <p role="status" className={styles.empty}>
            Đang tải nhật ký…
          </p>
        ) : !state.data?.items.length ? (
          <div className={styles.empty}>
            <Search className="mx-auto mb-3 size-8" />
            <p>Không có sự kiện phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={styles.table}>
              <caption className="sr-only">Danh sách sự kiện nhật ký</caption>
              <thead>
                <tr>
                  <th scope="col">Thời điểm</th>
                  <th scope="col">Người thực hiện</th>
                  <th scope="col">Module / hành động</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Kết quả</th>
                  <th scope="col">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {state.data.items.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap">
                      {formatTime(event.createdAt)}
                    </td>
                    <td>{event.actorName}</td>
                    <td>
                      <strong>{moduleLabel(event.module)}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {actionLabel(event.action)}
                      </p>
                    </td>
                    <td>
                      <p>{event.entityName || entityLabel(event.entityType)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entityLabel(event.entityType)}
                      </p>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${event.result === "SUCCESS" ? styles.success : event.result === "FAILURE" ? styles.failure : styles.denied}`}
                      >
                        {resultLabels[event.result]}
                      </span>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={`Xem chi tiết ${event.entityName || event.id}`}
                        onClick={(click) => {
                          lastTrigger.current = click.currentTarget;
                          setSelected(event.id);
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.footer}>
          <span className="text-sm text-muted-foreground">
            {state.data?.total ?? 0} sự kiện · Trang {page} /{" "}
            {Math.max(1, Math.ceil((state.data?.total ?? 0) / 20))}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1 || state.loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={
                !state.data || page * 20 >= state.data.total || state.loading
              }
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </section>
      {selected && (
        <Dialog
          open
          onClose={() => setSelected(null)}
          returnFocus={() => lastTrigger.current?.focus()}
          title="Chi tiết sự kiện"
          description="Thông tin thao tác và thay đổi được ghi nhận tại thời điểm phát sinh."
        >
          <EventDetail key={selected} id={selected} onDenied={onDenied} />
        </Dialog>
      )}
    </div>
  );
}
