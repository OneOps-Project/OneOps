"use client";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { RecordDto } from "@/features/hr-management/organization/positions-grades/types";
import {
  definition,
  MOCK_DEPARTMENTS,
  MOCK_EMPLOYEES,
} from "@/features/hr-management/organization/positions-grades/constants";
import { client } from "@/features/hr-management/organization/positions-grades/api/client";
import {
  useModuleRecords,
  recordsChanged,
} from "@/features/hr-management/organization/positions-grades/hooks/use-records";
import {
  useWorkspace,
  Modal,
} from "@/features/hr-management/organization/positions-grades/components/primitives/workspace";
import { Button } from "@/features/hr-management/organization/positions-grades/components/primitives/button";
import {
  Input,
  Select,
} from "@/features/hr-management/organization/positions-grades/components/primitives/forms";
import { Badge } from "@/features/hr-management/organization/positions-grades/components/primitives/foundations";
import { Icon } from "@/features/hr-management/organization/positions-grades/components/primitives/icon";
import { RecordForm } from "@/features/hr-management/organization/positions-grades/components/record-form";
import styles from "@/features/hr-management/organization/positions-grades/components/styles.module.css";

export function ModulePage({
  initialView = "table",
}: {
  initialView?: "table" | "grid";
}) {
  const params = useSearchParams();
  const { openCreate, notify } = useWorkspace();
  const { records, loading, error } = useModuleRecords();

  const [activeTab, setActiveTab] = useState<string>(
    params.get("tab") || params.get("scope") || "all",
  );
  const [query, setQuery] = useState(params.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(
    params.get("status") || "all",
  );
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">(initialView);

  const [detailRecord, setDetailRecord] = useState<RecordDto | null>(null);
  const [editingRecord, setEditingRecord] = useState<RecordDto | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<RecordDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const jobTitles = records.filter((r) => r.scope === "job_title");
    const designations = records.filter((r) => r.scope === "designation");
    const grades = records.filter((r) => r.scope === "grade");

    const totalTarget = jobTitles.reduce(
      (sum, r) => sum + (r.fields?.targetHeadcount || 0),
      0,
    );
    const totalCurrent = jobTitles.reduce(
      (sum, r) => sum + (r.fields?.currentHeadcount || 0),
      0,
    );
    const fillRate =
      totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 100;

    return {
      totalJobTitles: jobTitles.length,
      totalDesignations: designations.length,
      totalGrades: grades.length,
      totalTarget,
      totalCurrent,
      fillRate,
    };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Tab filter
      if (activeTab === "job_title" && r.scope !== "job_title") return false;
      if (activeTab === "designation" && r.scope !== "designation")
        return false;
      if (activeTab === "grade" && r.scope !== "grade") return false;
      if (activeTab === "matrix") return false; // Handled separately

      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // Department filter (for job titles)
      if (
        departmentFilter !== "all" &&
        r.scope === "job_title" &&
        r.fields?.departmentId !== departmentFilter
      ) {
        return false;
      }

      // Text search
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const searchable = [
          r.code,
          r.name,
          r.assignee,
          r.note,
          r.fields?.departmentName,
          r.fields?.competencies,
          r.fields?.responsibilities,
          r.fields?.tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [records, activeTab, statusFilter, departmentFilter, query]);

  // Formatter for currency
  function formatMoney(amount?: number) {
    if (amount === undefined || amount === null) return "—";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Delete handler
  async function handleDelete() {
    if (!deletingRecord) return;
    setDeleting(true);
    try {
      await client.remove(deletingRecord);
      notify(`Đã xóa '${deletingRecord.name}' thành công.`);
      recordsChanged();
      setDeletingRecord(null);
      if (detailRecord?.id === deletingRecord.id) {
        setDetailRecord(null);
      }
    } catch (err: any) {
      notify(err?.message || "Không thể xóa bản ghi.");
    } finally {
      setDeleting(false);
    }
  }

  // Status toggle handler
  async function handleToggleStatus(record: RecordDto) {
    const nextStatus =
      record.status === "Đang áp dụng" ? "Ngừng áp dụng" : "Đang áp dụng";
    try {
      await client.update(record, { status: nextStatus });
      notify(`Đã đổi trạng thái sang '${nextStatus}'.`);
      recordsChanged();
    } catch (err: any) {
      notify(err?.message || "Không thể cập nhật trạng thái.");
    }
  }

  // Export report
  function handleExport() {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Mã,Tên,Phân loại,Trạng thái,Định biên,Lương tối thiểu,Lương tối đa"]
        .concat(
          records.map(
            (r) =>
              `"${r.code}","${r.name}","${r.scope}","${r.status}","${r.fields?.targetHeadcount || 0}","${r.fields?.salaryMin || 0}","${r.fields?.salaryMax || 0}"`,
          ),
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `oneops-positions-grades-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Đã xuất báo cáo CSV thành công.");
  }

  // Reset demo data
  function handleResetData() {
    client.resetMockData();
    recordsChanged();
    notify("Đã khôi phục dữ liệu mẫu chuẩn thành công.");
  }

  // Employees associated with selected record
  const associatedEmployees = useMemo(() => {
    if (!detailRecord) return [];
    if (detailRecord.scope === "job_title") {
      return MOCK_EMPLOYEES.filter((e) => e.positionCode === detailRecord.code);
    }
    if (detailRecord.scope === "designation") {
      return MOCK_EMPLOYEES.filter(
        (e) => e.designationCode === detailRecord.code,
      );
    }
    if (detailRecord.scope === "grade") {
      return MOCK_EMPLOYEES.filter((e) => e.gradeCode === detailRecord.code);
    }
    return [];
  }, [detailRecord]);

  // Matrix data
  const matrixData = useMemo(() => {
    const jobTitles = records.filter((r) => r.scope === "job_title");
    const grades = records
      .filter((r) => r.scope === "grade")
      .sort((a, b) => (a.fields?.rank || 0) - (b.fields?.rank || 0));

    return { jobTitles, grades };
  }, [records]);

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Quản lý Chức danh, Chức vụ và Cấp bậc</h1>
          <p>
            Quy chuẩn hóa vị trí chuyên môn, chức vụ lãnh đạo, khung đãi ngộ và
            định biên nhân sự toàn doanh nghiệp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetData}
            title="Khôi phục dữ liệu ban đầu"
          >
            <Icon name="refresh" size={14} />
            Dữ liệu mẫu
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Icon name="download" size={14} />
            Xuất báo cáo
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              openCreate(
                activeTab === "job_title" ||
                  activeTab === "designation" ||
                  activeTab === "grade"
                  ? (activeTab as any)
                  : "job_title",
              )
            }
          >
            <Icon name="plus" size={16} />
            Tạo mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} bg-primary/10 text-primary`}>
            <Icon name="briefcase" size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{stats.totalJobTitles}</span>
            <span className={styles.kpiLabel}>Chức danh nghề nghiệp</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} bg-info/10 text-info`}>
            <Icon name="award" size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{stats.totalDesignations}</span>
            <span className={styles.kpiLabel}>Chức vụ quản lý</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} bg-warning/10 text-warning`}>
            <Icon name="layers" size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{stats.totalGrades}</span>
            <span className={styles.kpiLabel}>Thang cấp bậc (Grades)</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIcon} bg-success/10 text-success`}>
            <Icon name="users" size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {stats.totalCurrent} / {stats.totalTarget}
            </span>
            <span className={styles.kpiLabel}>
              Lấp đầy định biên ({stats.fillRate}%)
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabBar}>
        {definition.tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          let count = records.length;
          if (tab.key === "job_title") count = stats.totalJobTitles;
          if (tab.key === "designation") count = stats.totalDesignations;
          if (tab.key === "grade") count = stats.totalGrades;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`${styles.tabItem} ${isActive ? styles.tabActive : ""}`}
            >
              {tab.label}
              {tab.key !== "matrix" && (
                <span className={styles.tabBadge}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {activeTab === "matrix" ? (
        /* Matrix View */
        <div className={styles.tableWrapper}>
          <div className="p-4 border-b border-border bg-surface flex justify-between items-center">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Ma trận Quy hoạch Chức danh và Cấp bậc
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bảng đối chiếu dải cấp bậc áp dụng và khung đãi ngộ cho từng vị
                trí chuyên môn trong tổ chức.
              </p>
            </div>
            <Badge variant="brand">6 Cấp bậc tiêu chuẩn</Badge>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.matrixTable}>
              <thead>
                <tr className="bg-muted">
                  <th className="min-w-[220px]">Chức danh / Vị trí</th>
                  <th className="min-w-[160px]">Khối phòng ban</th>
                  {matrixData.grades.map((grade) => (
                    <th key={grade.id} className="min-w-[130px]">
                      <div className="font-semibold text-foreground">
                        {grade.code}
                      </div>
                      <div className="text-[11px] font-normal text-muted-foreground">
                        {grade.name.replace(/Cấp bậc \d+ /, "")}
                      </div>
                      <div className="text-[10px] text-primary mt-1 font-mono">
                        {formatMoney(grade.fields?.salaryMin).replace(" ₫", "")}{" "}
                        -{" "}
                        {formatMoney(grade.fields?.salaryMax).replace(" ₫", "")}
                      </div>
                    </th>
                  ))}
                  <th className="min-w-[100px]">Định biên</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.jobTitles.map((jt) => {
                  const applicable = jt.fields?.applicableGrades || [];
                  return (
                    <tr key={jt.id} className="hover:bg-muted/40">
                      <td className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-semibold">
                            {jt.code}
                          </span>
                          <span>{jt.name}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground text-xs">
                        {jt.fields?.departmentName || "Khối Sản xuất"}
                      </td>
                      {matrixData.grades.map((grade) => {
                        const isApplicable = applicable.includes(grade.code);
                        // Mock employee count at this grade
                        const emps = MOCK_EMPLOYEES.filter(
                          (e) =>
                            e.positionCode === jt.code &&
                            e.gradeCode === grade.code,
                        );

                        return (
                          <td key={grade.id} className="text-center">
                            {isApplicable ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="size-6 rounded-full bg-success/15 text-success inline-flex items-center justify-center text-xs font-bold">
                                  ✓
                                </span>
                                {emps.length > 0 && (
                                  <span className="text-[10.5px] font-medium text-muted-foreground mt-0.5">
                                    {emps.length} nhân sự
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center font-medium">
                        <span className="text-primary font-semibold">
                          {jt.fields?.currentHeadcount || 0}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          / {jt.fields?.targetHeadcount || 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Regular List / Grid View */
        <>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarGroup}>
              <div className={styles.searchBox}>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo mã, tên, kỹ năng..."
                  className="pl-9"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <Icon name="search" size={15} />
                </span>
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-auto min-w-[150px]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đang áp dụng">Đang áp dụng</option>
                <option value="Ngừng áp dụng">Ngừng áp dụng</option>
              </Select>

              {/* Department Filter (Visible when applicable) */}
              {(activeTab === "all" || activeTab === "job_title") && (
                <Select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-auto min-w-[180px]"
                >
                  <option value="all">Tất cả phòng ban / khối</option>
                  {MOCK_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div className="flex items-center gap-1.5 border border-border rounded-control p-0.5 bg-surface">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Xem dạng bảng"
              >
                <Icon name="menu" size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Xem dạng thẻ"
              >
                <Icon name="layers" size={15} />
              </button>
            </div>
          </div>

          {/* Results count & loading */}
          {loading && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Đang tải danh mục...
            </div>
          )}

          {!loading && filteredRecords.length === 0 ? (
            <div className={styles.emptyState}>
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Icon name="empty" size={24} />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Không tìm thấy bản ghi nào
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thử thay đổi bộ lọc tìm kiếm hoặc thêm mới bản ghi.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  openCreate(
                    activeTab === "designation" || activeTab === "grade"
                      ? (activeTab as any)
                      : "job_title",
                  )
                }
              >
                <Icon name="plus" size={14} />
                Tạo mới ngay
              </Button>
            </div>
          ) : viewMode === "table" ? (
            /* Table View */
            <div className={styles.tableWrapper}>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Tên gọi</th>
                      <th>Phân loại</th>
                      <th>Thuộc tính / Chi tiết</th>
                      <th>Định biên</th>
                      <th>Khung lương / Phụ cấp</th>
                      <th>Trạng thái</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => {
                      const scopeBadge =
                        r.scope === "job_title"
                          ? { label: "Chức danh", variant: "brand" as const }
                          : r.scope === "designation"
                            ? { label: "Chức vụ", variant: "info" as const }
                            : { label: "Cấp bậc", variant: "warning" as const };

                      return (
                        <tr key={r.id}>
                          <td>
                            <button
                              type="button"
                              onClick={() => setDetailRecord(r)}
                              className="font-mono text-xs font-bold text-primary hover:underline"
                            >
                              {r.code}
                            </button>
                          </td>
                          <td>
                            <div className="font-medium text-foreground">
                              {r.name}
                            </div>
                            {r.note && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {r.note}
                              </div>
                            )}
                          </td>
                          <td>
                            <Badge variant={scopeBadge.variant}>
                              {scopeBadge.label}
                            </Badge>
                          </td>
                          <td>
                            {r.scope === "job_title" && (
                              <div className="text-xs text-muted-foreground">
                                <div>
                                  {r.fields?.departmentName || "Chưa gán"}
                                </div>
                                {r.fields?.applicableGrades && (
                                  <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                                    Dải bậc:{" "}
                                    {r.fields.applicableGrades.join(", ")}
                                  </div>
                                )}
                              </div>
                            )}
                            {r.scope === "designation" && (
                              <div className="text-xs text-muted-foreground">
                                Cấp quản lý: Cấp {r.fields?.levelOrder || 3}
                              </div>
                            )}
                            {r.scope === "grade" && (
                              <div className="text-xs text-muted-foreground">
                                Bậc {r.fields?.rank || 1} •{" "}
                                {r.fields?.experienceRequired || "Chưa rõ"}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="font-semibold text-foreground">
                              {r.fields?.currentHeadcount || 0}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {" "}
                              / {r.fields?.targetHeadcount || 0}
                            </span>
                          </td>
                          <td>
                            {r.scope === "grade" && (
                              <div className="text-xs font-mono font-medium text-foreground">
                                {formatMoney(r.fields?.salaryMin)} -{" "}
                                {formatMoney(r.fields?.salaryMax)}
                              </div>
                            )}
                            {r.scope === "designation" && (
                              <div className="text-xs font-mono text-foreground">
                                Phụ cấp: {formatMoney(r.fields?.allowance)}
                              </div>
                            )}
                            {r.scope === "job_title" && (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(r)}
                              className="cursor-pointer"
                            >
                              <Badge
                                variant={
                                  r.status === "Đang áp dụng"
                                    ? "success"
                                    : "neutral"
                                }
                                dot
                              >
                                {r.status}
                              </Badge>
                            </button>
                          </td>
                          <td className="text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailRecord(r)}
                                title="Xem chi tiết"
                              >
                                <Icon name="eye" size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingRecord(r)}
                                title="Chỉnh sửa"
                              >
                                <Icon name="edit" size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingRecord(r)}
                                title="Xóa"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Icon name="trash" size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid Card View */
            <div className={styles.cardGrid}>
              {filteredRecords.map((r) => {
                const scopeBadge =
                  r.scope === "job_title"
                    ? { label: "Chức danh", variant: "brand" as const }
                    : r.scope === "designation"
                      ? { label: "Chức vụ", variant: "info" as const }
                      : { label: "Cấp bậc", variant: "warning" as const };

                return (
                  <div key={r.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <span className={styles.cardCode}>{r.code}</span>
                        <h3 className={styles.cardTitle}>{r.name}</h3>
                      </div>
                      <Badge variant={scopeBadge.variant}>
                        {scopeBadge.label}
                      </Badge>
                    </div>

                    {r.fields?.departmentName && (
                      <div className={styles.cardDepartment}>
                        <Icon name="briefcase" size={13} />
                        <span>{r.fields.departmentName}</span>
                      </div>
                    )}

                    <div className={styles.cardBody}>
                      {r.note ||
                        r.fields?.competencies ||
                        "Chưa có mô tả chi tiết."}
                    </div>

                    {r.scope === "grade" && (
                      <div className="text-xs font-mono font-semibold text-primary bg-primary/5 p-2 rounded">
                        Lương: {formatMoney(r.fields?.salaryMin)} -{" "}
                        {formatMoney(r.fields?.salaryMax)}
                      </div>
                    )}

                    {r.scope === "designation" && (
                      <div className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded flex justify-between">
                        <span>Cấp {r.fields?.levelOrder || 3}</span>
                        <span>Phụ cấp: {formatMoney(r.fields?.allowance)}</span>
                      </div>
                    )}

                    <div className={styles.cardFooter}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Nhân sự:
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {r.fields?.currentHeadcount || 0} /{" "}
                          {r.fields?.targetHeadcount || 0}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailRecord(r)}
                        >
                          <Icon name="eye" size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRecord(r)}
                        >
                          <Icon name="edit" size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingRecord(r)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Icon name="trash" size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Detail Drawer Modal */}
      {detailRecord && (
        <Modal
          title={`Chi tiết ${detailRecord.name}`}
          onClose={() => setDetailRecord(null)}
          sheet
        >
          <div className={styles.detailsDrawer}>
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {detailRecord.code}
                </span>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  {detailRecord.name}
                </h2>
              </div>
              <Badge
                variant={
                  detailRecord.status === "Đang áp dụng" ? "success" : "neutral"
                }
                dot
              >
                {detailRecord.status}
              </Badge>
            </div>

            <div className={styles.detailGrid}>
              <div>
                <div className={styles.detailLabel}>Phân loại</div>
                <div className={styles.detailValue}>
                  {detailRecord.scope === "job_title"
                    ? "Chức danh nghề nghiệp"
                    : detailRecord.scope === "designation"
                      ? "Chức vụ quản lý"
                      : "Cấp bậc nhân sự"}
                </div>
              </div>
              <div>
                <div className={styles.detailLabel}>Ngày hiệu lực</div>
                <div className={styles.detailValue}>{detailRecord.date}</div>
              </div>
              <div>
                <div className={styles.detailLabel}>Định biên nhân sự</div>
                <div className={styles.detailValue}>
                  {detailRecord.fields?.currentHeadcount || 0} /{" "}
                  {detailRecord.fields?.targetHeadcount || 0} người
                </div>
              </div>
              <div>
                <div className={styles.detailLabel}>Người phụ trách</div>
                <div className={styles.detailValue}>
                  {detailRecord.assignee || "Phòng Nhân sự"}
                </div>
              </div>
            </div>

            {/* Scope specific info */}
            {detailRecord.scope === "grade" && (
              <div className="rounded-control border border-border p-3.5 bg-surface flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Khung đãi ngộ & Lương
                </div>
                <div className="text-base font-mono font-bold text-primary">
                  {formatMoney(detailRecord.fields?.salaryMin)} —{" "}
                  {formatMoney(detailRecord.fields?.salaryMax)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Yêu cầu kinh nghiệm:{" "}
                  {detailRecord.fields?.experienceRequired ||
                    "Theo tiêu chuẩn chuyên môn"}
                </div>
              </div>
            )}

            {detailRecord.scope === "designation" && (
              <div className="rounded-control border border-border p-3.5 bg-surface flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Chế độ & Trách nhiệm chức vụ
                </div>
                <div className="text-sm font-semibold text-foreground">
                  Cấp bậc điều hành: Cấp {detailRecord.fields?.levelOrder || 3}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  Phụ cấp chức vụ: {formatMoney(detailRecord.fields?.allowance)}{" "}
                  / tháng
                </div>
              </div>
            )}

            {detailRecord.note && (
              <div>
                <div className={styles.sectionTitle}>
                  <Icon name="file" size={14} />
                  Mô tả / Ghi chú
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-control border border-border">
                  {detailRecord.note}
                </p>
              </div>
            )}

            {detailRecord.fields?.competencies && (
              <div>
                <div className={styles.sectionTitle}>
                  <Icon name="award" size={14} />
                  Yêu cầu năng lực & kỹ năng
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-control border border-border">
                  {detailRecord.fields.competencies}
                </p>
              </div>
            )}

            {/* Mock Employee List */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <div className={styles.sectionTitle}>
                  <Icon name="users" size={14} />
                  Nhân sự đang giữ vị trí ({associatedEmployees.length})
                </div>
                <span className="text-xs text-muted-foreground italic">
                  Dữ liệu tích hợp mẫu
                </span>
              </div>

              {associatedEmployees.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded border border-dashed border-border">
                  Chưa có nhân sự nào được gán vị trí này.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {associatedEmployees.map((emp) => (
                    <div key={emp.id} className={styles.employeeItem}>
                      <img
                        src={emp.avatar}
                        alt={emp.fullName}
                        className={styles.employeeAvatar}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-foreground">
                            {emp.fullName}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {emp.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {emp.departmentName} •{" "}
                          {emp.gradeName.replace(/Cấp bậc \d+ /, "")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailRecord(null)}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingRecord(detailRecord);
                  setDetailRecord(null);
                }}
              >
                <Icon name="edit" size={14} />
                Chỉnh sửa
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <Modal
          title={`Chỉnh sửa ${editingRecord.name}`}
          onClose={() => setEditingRecord(null)}
        >
          <RecordForm
            initial={editingRecord}
            onClose={() => setEditingRecord(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <Modal
          title="Xác nhận xóa bản ghi"
          onClose={() => setDeletingRecord(null)}
        >
          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm text-foreground">
              Bạn có chắc chắn muốn xóa bản ghi{" "}
              <strong className="text-destructive font-semibold">
                {deletingRecord.name} ({deletingRecord.code})
              </strong>{" "}
              không? Thao tác này sẽ loại bỏ bản ghi khỏi danh mục quản lý.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => setDeletingRecord(null)}
                disabled={deleting}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                loading={deleting}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
