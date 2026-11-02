"use client";
import { useState } from "react";
import type {
  RecordDto,
  RecordInput,
} from "@/features/hr-management/organization/positions-grades/types";
import { client } from "@/features/hr-management/organization/positions-grades/api/client";
import { recordsChanged } from "@/features/hr-management/organization/positions-grades/hooks/use-records";
import { useWorkspace } from "@/features/hr-management/organization/positions-grades/components/primitives/workspace";
import { Button } from "@/features/hr-management/organization/positions-grades/components/primitives/button";
import {
  Input,
  Select,
  Textarea,
} from "@/features/hr-management/organization/positions-grades/components/primitives/forms";
import { MOCK_DEPARTMENTS } from "@/features/hr-management/organization/positions-grades/constants";

export function RecordForm({
  initial,
  defaultScope = "job_title",
  onClose,
}: {
  initial?: RecordDto | null;
  defaultScope?: "job_title" | "designation" | "grade";
  onClose: () => void;
}) {
  const { notify } = useWorkspace();
  const [scope, setScope] = useState<"job_title" | "designation" | "grade">(
    (initial?.scope as any) || defaultScope,
  );
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [status, setStatus] = useState<"Đang áp dụng" | "Ngừng áp dụng">(
    (initial?.status as any) || "Đang áp dụng",
  );
  const [date, setDate] = useState(
    initial?.date || new Date().toISOString().slice(0, 10),
  );
  const [assignee, setAssignee] = useState(initial?.assignee || "");
  const [note, setNote] = useState(initial?.note || "");

  // Fields specialized by scope
  const [departmentId, setDepartmentId] = useState(
    initial?.fields?.departmentId || (MOCK_DEPARTMENTS[0]?.id ?? ""),
  );
  const [rank, setRank] = useState(initial?.fields?.rank?.toString() || "1");
  const [levelOrder, setLevelOrder] = useState(
    initial?.fields?.levelOrder?.toString() || "3",
  );
  const [salaryMin, setSalaryMin] = useState(
    initial?.fields?.salaryMin !== undefined
      ? initial.fields.salaryMin.toString()
      : "",
  );
  const [salaryMax, setSalaryMax] = useState(
    initial?.fields?.salaryMax !== undefined
      ? initial.fields.salaryMax.toString()
      : "",
  );
  const [targetHeadcount, setTargetHeadcount] = useState(
    initial?.fields?.targetHeadcount !== undefined
      ? initial.fields.targetHeadcount.toString()
      : "5",
  );
  const [allowance, setAllowance] = useState(
    initial?.fields?.allowance !== undefined
      ? initial.fields.allowance.toString()
      : "",
  );
  const [experienceRequired, setExperienceRequired] = useState(
    initial?.fields?.experienceRequired || "",
  );
  const [competencies, setCompetencies] = useState(
    initial?.fields?.competencies || "",
  );
  const [responsibilities, setResponsibilities] = useState(
    initial?.fields?.responsibilities || "",
  );
  const [reportsTo, setReportsTo] = useState(initial?.fields?.reportsTo || "");
  const [applicableGrades, setApplicableGrades] = useState(
    initial?.fields?.applicableGrades?.join(", ") || "CB-02, CB-03, CB-04",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedDepartment = MOCK_DEPARTMENTS.find(
    (d) => d.id === departmentId,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Mã bản ghi bắt buộc phải nhập");
      return;
    }
    if (!name.trim()) {
      setError("Tên bản ghi bắt buộc phải nhập");
      return;
    }

    const min = salaryMin ? parseInt(salaryMin, 10) : undefined;
    const max = salaryMax ? parseInt(salaryMax, 10) : undefined;
    if (min !== undefined && max !== undefined && min > max) {
      setError("Khung lương tối thiểu không được vượt quá khung lương tối đa");
      return;
    }

    setSaving(true);
    try {
      const payload: RecordInput = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        scope,
        status,
        date,
        assignee: assignee.trim(),
        note: note.trim(),
        fields: {
          kind: scope,
          ...(scope === "job_title"
            ? {
                departmentId,
                departmentName: selectedDepartment?.name || "",
                targetHeadcount: parseInt(targetHeadcount, 10) || 0,
                currentHeadcount: initial?.fields?.currentHeadcount || 0,
                applicableGrades: applicableGrades
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
                competencies: competencies.trim(),
                responsibilities: responsibilities.trim(),
                reportsTo: reportsTo.trim(),
              }
            : {}),
          ...(scope === "designation"
            ? {
                levelOrder: parseInt(levelOrder, 10) || 1,
                allowance: allowance ? parseInt(allowance, 10) : 0,
                targetHeadcount: parseInt(targetHeadcount, 10) || 0,
                currentHeadcount: initial?.fields?.currentHeadcount || 0,
                responsibilities: responsibilities.trim(),
                reportsTo: reportsTo.trim(),
              }
            : {}),
          ...(scope === "grade"
            ? {
                rank: parseInt(rank, 10) || 1,
                salaryMin: min,
                salaryMax: max,
                experienceRequired: experienceRequired.trim(),
                competencies: competencies.trim(),
                targetHeadcount: parseInt(targetHeadcount, 10) || 0,
                currentHeadcount: initial?.fields?.currentHeadcount || 0,
              }
            : {}),
        },
      };

      if (initial) {
        await client.update(initial, payload);
        notify(`Đã cập nhật '${payload.name}' thành công.`);
      } else {
        await client.create(payload);
        notify(`Đã tạo mới '${payload.name}' thành công.`);
      }

      recordsChanged();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra khi lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
      {error && (
        <div className="rounded-control border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Scope Selector */}
      {!initial && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Loại danh mục
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScope("job_title")}
              className={`rounded-control border p-2 text-xs font-medium transition-colors ${
                scope === "job_title"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              Chức danh nghề nghiệp
            </button>
            <button
              type="button"
              onClick={() => setScope("designation")}
              className={`rounded-control border p-2 text-xs font-medium transition-colors ${
                scope === "designation"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              Chức vụ quản lý
            </button>
            <button
              type="button"
              onClick={() => setScope("grade")}
              className={`rounded-control border p-2 text-xs font-medium transition-colors ${
                scope === "grade"
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border bg-surface text-muted-foreground hover:bg-muted"
              }`}
            >
              Cấp bậc nhân sự
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Mã định danh <span className="text-destructive">*</span>
          </label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={
              scope === "job_title"
                ? "VD: CD-BA, CD-DEV"
                : scope === "designation"
                  ? "VD: CV-TP, CV-TL"
                  : "VD: CB-01, CB-02"
            }
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Tên <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              scope === "job_title"
                ? "VD: Business Analyst, Frontend Dev"
                : scope === "designation"
                  ? "VD: Trưởng phòng, Trưởng nhóm"
                  : "VD: Cấp bậc 3 (Middle)"
            }
            required
          />
        </div>
      </div>

      {/* Scope-specific inputs */}
      {scope === "job_title" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Phòng ban / Khối trực thuộc
              </label>
              <Select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                {MOCK_DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Định biên nhân sự (Người)
              </label>
              <Input
                type="number"
                min="0"
                value={targetHeadcount}
                onChange={(e) => setTargetHeadcount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Dải cấp bậc áp dụng (phân cách bằng dấu phẩy)
            </label>
            <Input
              value={applicableGrades}
              onChange={(e) => setApplicableGrades(e.target.value)}
              placeholder="VD: CB-01, CB-02, CB-03, CB-04"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Yêu cầu năng lực & kỹ năng chuyên môn
            </label>
            <Textarea
              value={competencies}
              onChange={(e) => setCompetencies(e.target.value)}
              placeholder="Liệt kê kỹ năng chính, công nghệ hoặc chứng chỉ yêu cầu..."
              rows={2}
            />
          </div>
        </>
      )}

      {scope === "designation" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Cấp bậc quản lý
              </label>
              <Select
                value={levelOrder}
                onChange={(e) => setLevelOrder(e.target.value)}
              >
                <option value="1">
                  Cấp 1: Ban Lãnh đạo / Giám đốc điều hành
                </option>
                <option value="2">
                  Cấp 2: Quản lý Khối / Trưởng phòng ban
                </option>
                <option value="3">Cấp 3: Phó phòng / Trưởng nhóm (Lead)</option>
                <option value="4">
                  Cấp 4: Nhân viên chính thức / Thực tập sinh
                </option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Phụ cấp chức vụ (VNĐ/tháng)
              </label>
              <Input
                type="number"
                min="0"
                step="100000"
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
                placeholder="VD: 5000000"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Trách nhiệm & Quyền hạn phê duyệt
            </label>
            <Textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="Quyền hạn phê duyệt đơn, giao việc, đánh giá hiệu quả..."
              rows={2}
            />
          </div>
        </>
      )}

      {scope === "grade" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Bậc số (Rank)
              </label>
              <Select value={rank} onChange={(e) => setRank(e.target.value)}>
                <option value="1">Bậc 1 (Intern/Fresher)</option>
                <option value="2">Bậc 2 (Junior/Associate)</option>
                <option value="3">Bậc 3 (Middle)</option>
                <option value="4">Bậc 4 (Senior)</option>
                <option value="5">Bậc 5 (Lead/Principal)</option>
                <option value="6">Bậc 6 (Director/Expert)</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Lương tối thiểu (VNĐ)
              </label>
              <Input
                type="number"
                min="0"
                step="1000000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="VD: 15000000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">
                Lương tối đa (VNĐ)
              </label>
              <Input
                type="number"
                min="0"
                step="1000000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="VD: 25000000"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Yêu cầu số năm kinh nghiệm
            </label>
            <Input
              value={experienceRequired}
              onChange={(e) => setExperienceRequired(e.target.value)}
              placeholder="VD: 2 - 4 năm kinh nghiệm chuyên môn"
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Trạng thái áp dụng
          </label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="Đang áp dụng">Đang áp dụng</option>
            <option value="Ngừng áp dụng">Ngừng áp dụng</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Ngày hiệu lực
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase">
          Mô tả chi tiết / Ghi chú
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Thông tin bổ sung, bối cảnh áp dụng..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-border">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Hủy bỏ
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {initial ? "Lưu thay đổi" : "Tạo mới"}
        </Button>
      </div>
    </form>
  );
}
