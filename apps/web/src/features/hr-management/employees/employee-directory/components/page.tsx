"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  EmployeeDto,
  Status,
} from "@/features/hr-management/employees/employee-directory/types";
import {
  definition,
  statusLabels,
} from "@/features/hr-management/employees/employee-directory/constants";
import { client } from "@/features/hr-management/employees/employee-directory/api/client";
import { useEmployees } from "@/features/hr-management/employees/employee-directory/hooks/use-employees";
import {
  Modal,
  useWorkspace,
} from "@/features/hr-management/employees/employee-directory/components/primitives/workspace";
import { Button } from "@/features/hr-management/employees/employee-directory/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/hr-management/employees/employee-directory/components/primitives/forms";
import { Badge } from "@/features/hr-management/employees/employee-directory/components/primitives/foundations";
import { EmployeeForm } from "@/features/hr-management/employees/employee-directory/components/employee-form";
const isActive = (status: Status) => status === "ACTIVE";
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant={isActive(status) ? "success" : "neutral"} dot>
      {statusLabels[status]}
    </Badge>
  );
}
export function ModulePage() {
  const params = useSearchParams();
  const { notify } = useWorkspace();
  const { employees, loading, error, reload } = useEmployees();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState<Status | "ALL">(
    params.get("status") === "ACTIVE" || params.get("status") === "INACTIVE"
      ? (params.get("status") as Status)
      : "ALL",
  );
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EmployeeDto | null>(null);
  const [target, setTarget] = useState<EmployeeDto | null>(null);
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const departments = useMemo(
    () =>
      [...new Set(employees.map((item) => item.departmentName).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "vi"))
        .map((name) => ({
          name,
          count: employees.filter((item) => item.departmentName === name)
            .length,
        })),
    [employees],
  );
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi");
    return employees.filter(
      (item) =>
        (status === "ALL" || item.status === status) &&
        (department === "ALL" || item.departmentName === department) &&
        (!term ||
          `${item.code} ${item.fullName} ${item.email} ${item.phone} ${item.jobTitle} ${item.teamName} ${item.managerName}`
            .toLocaleLowerCase("vi")
            .includes(term)),
    );
  }, [department, employees, query, status]);
  const activeCount = employees.filter((item) => isActive(item.status)).length;
  async function confirmToggle() {
    if (!target || pending) return;
    setPending(true);
    setActionError("");
    try {
      const next: Status = isActive(target.status) ? "INACTIVE" : "ACTIVE";
      await client.update(target, { status: next });
      setTarget(null);
      notify(
        next === "ACTIVE"
          ? "Đã đưa nhân viên trở lại trạng thái làm việc."
          : "Đã ghi nhận nhân viên nghỉ việc.",
      );
      reload();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Không thể đổi trạng thái",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="module-view">
      <section className="records-panel">
        <header className="page-header">
          <div>
            <span className="eyebrow">Nhân sự · Hồ sơ</span>
            <h1>{definition.title}</h1>
            <p>
              Hồ sơ nhân sự dùng cho phân công công việc, điểm danh và báo cáo;
              chức danh chỉ là thuộc tính, không cấp quyền.
            </p>
          </div>
          <div className="page-actions">
            <Button onClick={() => setCreating(true)}>Thêm nhân viên</Button>
          </div>
        </header>

        <dl className="metric-strip">
          <div className="metric">
            <dt>Tổng nhân sự</dt>
            <dd>{employees.length}</dd>
          </div>
          <div className="metric">
            <dt>Đang làm việc</dt>
            <dd>{activeCount}</dd>
          </div>
          <div className="metric">
            <dt>Phòng ban</dt>
            <dd>{departments.length}</dd>
          </div>
        </dl>

        <div className="toolbar">
          <Input
            aria-label="Tìm nhân viên"
            placeholder="Tìm theo mã, tên, email, chức danh…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            aria-label="Lọc phòng ban"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="ALL">Tất cả phòng ban</option>
            {departments.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} ({item.count})
              </option>
            ))}
          </Select>
          <Select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as Status | "ALL")
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">{statusLabels.ACTIVE}</option>
            <option value="INACTIVE">{statusLabels.INACTIVE}</option>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtered.length} nhân sự
          </span>
        </div>

        {(error || actionError) && (
          <div role="alert" className="error">
            {error || actionError}
            <Button variant="ghost" onClick={reload}>
              Thử lại
            </Button>
          </div>
        )}

        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải danh bạ nhân sự…
          </p>
        ) : !filtered.length ? (
          <div className="surface empty-state">
            <h2>
              {employees.length
                ? "Không có nhân sự phù hợp"
                : "Chưa có nhân sự"}
            </h2>
            <p>
              {employees.length
                ? "Xóa hoặc đổi điều kiện lọc để xem lại."
                : "Thêm nhân sự đầu tiên để bắt đầu phân công công việc."}
            </p>
            {!employees.length && (
              <Button size="sm" onClick={() => setCreating(true)}>
                Thêm nhân viên
              </Button>
            )}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2 sm:hidden">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-panel border border-border bg-surface p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {item.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.code}
                        {item.jobTitle ? ` · ${item.jobTitle}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="truncate">{item.email || "—"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Phòng ban</dt>
                      <dd className="truncate">
                        {item.departmentName || "Chưa gán phòng ban"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Nhóm</dt>
                      <dd className="truncate">
                        {item.teamName || "Chưa gán nhóm"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Vào làm</dt>
                      <dd>
                        {item.startDate ? formatDate(item.startDate) : "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(item)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActionError("");
                        setTarget(item);
                      }}
                    >
                      {isActive(item.status) ? "Cho nghỉ" : "Kích hoạt"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="relative hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Danh sách nhân sự theo phòng ban và trạng thái
                </caption>
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th scope="col" className="px-2 py-2 font-medium">
                      Nhân sự
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Liên hệ
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Tổ chức
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-2 py-2 font-medium">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-2 py-3 align-top">
                        <span className="block font-semibold text-foreground">
                          {item.fullName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.code}
                          {item.jobTitle ? ` · ${item.jobTitle}` : ""}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className="block">{item.email || "—"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.phone || "Chưa có số điện thoại"}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className="block">
                          {item.departmentName || "Chưa gán phòng ban"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.teamName || "Chưa gán nhóm"}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <StatusBadge status={item.status} />
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {item.startDate
                            ? `Vào làm ${formatDate(item.startDate)}`
                            : "Chưa có ngày vào làm"}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(item)}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActionError("");
                              setTarget(item);
                            }}
                          >
                            {isActive(item.status) ? "Cho nghỉ" : "Kích hoạt"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Hồ sơ nhân sự không bị xóa cứng; dùng trạng thái “Đã nghỉ việc” để giữ
          lịch sử phân công và báo cáo.
        </p>
      </section>

      {creating && (
        <Modal title="Thêm nhân viên" onClose={() => setCreating(false)}>
          <EmployeeForm onClose={() => setCreating(false)} />
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Chỉnh sửa ${editing.fullName}`}
          onClose={() => setEditing(null)}
        >
          <EmployeeForm record={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
      {target && (
        <Modal
          title={isActive(target.status) ? "Ghi nhận nghỉ việc" : "Kích hoạt"}
          onClose={() => setTarget(null)}
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              {isActive(target.status)
                ? `Nhân sự “${target.fullName}” sẽ không xuất hiện khi phân công mới; dữ liệu công việc cũ vẫn giữ nguyên.`
                : `Nhân sự “${target.fullName}” sẽ trở lại trạng thái làm việc.`}
            </p>
            {actionError && (
              <p className="error" role="alert">
                {actionError}
              </p>
            )}
          </div>
          <footer className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Hủy
            </Button>
            <Button
              variant={isActive(target.status) ? "destructive" : "primary"}
              disabled={pending}
              onClick={() => void confirmToggle()}
            >
              {pending
                ? "Đang lưu…"
                : isActive(target.status)
                  ? "Cho nghỉ việc"
                  : "Kích hoạt"}
            </Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
