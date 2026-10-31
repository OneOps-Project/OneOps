"use client";
import { useState, useEffect } from "react";
import { client } from "@/features/work-management/work/tasks/api/client";
import type {
  RecordDto,
  EmployeeTaskStats,
} from "@/features/work-management/work/tasks/types";
import { Button } from "@/features/work-management/work/tasks/components/primitives/button";
import {
  Input,
  Textarea,
} from "@/features/work-management/work/tasks/components/primitives/forms";
import { Badge } from "@/features/work-management/work/tasks/components/primitives/foundations";

// Mock managerId - sau này lấy từ auth
const MOCK_MANAGER_ID = "manager-001";

export function ReassignForm({
  task,
  onClose,
}: {
  task: RecordDto;
  onClose: () => void;
}) {
  const [newAssignee, setNewAssignee] = useState("");
  const [reason, setReason] = useState(
    task.reassignmentFlag.needed ? task.reassignmentFlag.reason : "",
  );
  const [stats, setStats] = useState<EmployeeTaskStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // ROUND1-6: Load thống kê nhân viên khi nhập assignee
  useEffect(() => {
    if (newAssignee.length < 2) {
      setStats(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingStats(true);
      try {
        const employeeStats = await client.getEmployeeStats(newAssignee);
        setStats(employeeStats);
      } catch {
        setStats(null);
      } finally {
        setLoadingStats(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newAssignee]);

  const hasWarning = stats && stats.inProgressTasks >= 3;

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        if (!newAssignee.trim() || !reason.trim()) {
          setError("Vui lòng điền đầy đủ thông tin");
          return;
        }
        if (newAssignee.trim() === task.assignee) {
          setError("Người phụ trách mới phải khác người cũ");
          return;
        }

        setPending(true);
        setError("");
        try {
          await client.reassign(task.id, {
            newAssignee: newAssignee.trim(),
            managerId: MOCK_MANAGER_ID,
            reason: reason.trim(),
          });
          onClose();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Không thể giao lại task");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="form-body">
        <div className="rounded-control border border-border bg-surface p-3">
          <p className="text-sm">
            <strong>Task:</strong> {task.code} — {task.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Người phụ trách hiện tại: <strong>{task.assignee}</strong>
          </p>
          {task.reassignmentFlag.needed && (
            <Badge variant="warning" className="mt-2">
              Cần giao lại: {task.reassignmentFlag.reason}
            </Badge>
          )}
        </div>

        <label>
          Người phụ trách mới{" "}
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
          <Input
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            required
            maxLength={150}
            placeholder="Nhập tên nhân viên mới"
            aria-describedby={hasWarning ? "stats-warning" : "stats-info"}
          />
        </label>

        {/* ROUND1-6: Hiển thị thống kê task của nhân viên */}
        {loadingStats && (
          <p className="text-sm text-muted-foreground" role="status">
            Đang tải thông tin nhân viên…
          </p>
        )}
        {stats && !loadingStats && (
          <div
            id={hasWarning ? "stats-warning" : "stats-info"}
            className={`rounded-control border p-3 ${
              hasWarning
                ? "border-yellow-400 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-950/30"
                : "border-border bg-surface"
            }`}
            role={hasWarning ? "alert" : "status"}
          >
            <p className="mb-2 text-sm font-semibold">
              📊 Thống kê công việc của {stats.employeeId}:
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                • Task đang mở: <strong>{stats.openTasks}</strong>
              </li>
              <li>
                • Task "Đang làm": <strong>{stats.inProgressTasks}</strong>
              </li>
            </ul>
            {hasWarning && (
              <p className="mt-2 text-sm font-medium text-yellow-800 dark:text-yellow-300">
                ⚠️ Nhân viên này đang có ≥3 task "Đang làm". Cân nhắc phân công
                cho người khác.
              </p>
            )}
          </div>
        )}

        {/* TODO: Tích hợp hr-management/leaves để cảnh báo nghỉ phép */}

        <label>
          Lý do giao lại{" "}
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            maxLength={500}
            rows={3}
            placeholder="Nhập lý do giao lại task (bắt buộc)"
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>

      <footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Đang giao lại…" : "Giao lại"}
        </Button>
      </footer>
    </form>
  );
}
