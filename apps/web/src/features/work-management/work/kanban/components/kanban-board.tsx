"use client";
import { useState, useRef } from "react";
import type { BoardMode, BoardTask, StatusHistoryEntry } from "../types";
import { Badge } from "./primitives/foundations";
import { Select, Textarea } from "./primitives/forms";
import styles from "./styles.module.css";

const KANBAN_LANES = [
  "Cần làm",
  "Đang thực hiện",
  "Chờ duyệt",
  "Tạm hoãn",
  "Hoàn thành",
  "Đã hủy",
] as const;

type PendingReasonState = {
  task: BoardTask;
  fromLane: string;
  targetStatus: string;
  actionType: "hold" | "cancel" | "rework";
};

function normalizeLane(status: string): string {
  if (status === "Chờ phản hồi") return "Chờ duyệt";
  return KANBAN_LANES.includes(status as (typeof KANBAN_LANES)[number])
    ? status
    : "Cần làm";
}

function toBackendStatus(lane: string): string | null {
  if (lane === "Chờ duyệt") return "Chờ phản hồi";
  if (
    lane === "Cần làm" ||
    lane === "Đang thực hiện" ||
    lane === "Hoàn thành"
  ) {
    return lane;
  }
  return null;
}

function getInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "--";
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatShortDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}`;
}

function diffDays(dateStr: string, todayStr: string): number {
  const target = Date.parse(dateStr + "T00:00:00Z");
  const current = Date.parse(todayStr + "T00:00:00Z");
  if (Number.isNaN(target) || Number.isNaN(current)) return 999;
  return Math.round((target - current) / 86400000);
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function validateKanbanTransition(
  fromRaw: string,
  toRaw: string,
  boardMode: BoardMode,
): {
  valid: boolean;
  message?: string;
  requiresReason?: "hold" | "cancel" | "rework";
} {
  const from = normalizeLane(fromRaw);
  const to = normalizeLane(toRaw);
  if (from === to) return { valid: false };

  if (boardMode === "employee") {
    if (to === "Hoàn thành") {
      return {
        valid: false,
        message: `Sai luật phân quyền: Nhân viên không thể chuyển thẳng sang «Hoàn thành». Vui lòng chuyển sang «Chờ duyệt» để Quản lý nghiệm thu. Thẻ đã tự trả về cột «${from}».`,
      };
    }
    if (to === "Đã hủy") {
      return {
        valid: false,
        message: `Sai luật phân quyền: Nhân viên không có quyền «Đã hủy» công việc. Vui lòng chuyển sang «Tạm hoãn» kèm lý do. Thẻ đã tự trả về cột «${from}».`,
      };
    }
  }

  if (from === "Cần làm" && (to === "Chờ duyệt" || to === "Hoàn thành")) {
    return {
      valid: false,
      message: `Sai luật quy trình: Công việc ở cột «Cần làm» phải qua «Đang thực hiện» trước khi sang «${to}». Thẻ đã tự trả về cột «${from}».`,
    };
  }

  if (from === "Tạm hoãn" && (to === "Chờ duyệt" || to === "Hoàn thành")) {
    return {
      valid: false,
      message: `Sai luật quy trình: Công việc đang «Tạm hoãn» cần quay lại «Đang thực hiện» trước khi sang «${to}». Thẻ đã tự trả về cột «${from}».`,
    };
  }

  if (from === "Đã hủy" && to !== "Cần làm" && to !== "Đang thực hiện") {
    return {
      valid: false,
      message: `Sai luật quy trình: Công việc «Đã hủy» chỉ có thể bấm «Làm lại» để mở lại về «Cần làm» hoặc «Đang thực hiện». Thẻ đã tự trả về cột «${from}».`,
    };
  }

  if (from === "Hoàn thành" && to !== "Đang thực hiện" && to !== "Cần làm") {
    return {
      valid: false,
      message: `Sai luật quy trình: Công việc đã «Hoàn thành» chỉ có thể chuyển về «Đang thực hiện» (Làm lại). Thẻ đã tự trả về cột «${from}».`,
    };
  }

  if (to === "Tạm hoãn") {
    return { valid: true, requiresReason: "hold" };
  }
  if (to === "Đã hủy") {
    return { valid: true, requiresReason: "cancel" };
  }
  if (
    (from === "Chờ duyệt" && (to === "Đang thực hiện" || to === "Cần làm")) ||
    (from === "Hoàn thành" && (to === "Đang thực hiện" || to === "Cần làm")) ||
    (from === "Đã hủy" && (to === "Cần làm" || to === "Đang thực hiện"))
  ) {
    return { valid: true, requiresReason: "rework" };
  }

  return { valid: true };
}

function laneTheme(lane: string) {
  switch (lane) {
    case "Đang thực hiện":
      return {
        column: styles.columnInfo,
        dot: styles.dotInfo,
        badge: "info" as const,
      };
    case "Chờ duyệt":
    case "Tạm hoãn":
      return {
        column: styles.columnWarning,
        dot: styles.dotWarning,
        badge: "warning" as const,
      };
    case "Hoàn thành":
      return {
        column: styles.columnSuccess,
        dot: styles.dotSuccess,
        badge: "success" as const,
      };
    case "Đã hủy":
      return {
        column: styles.columnDanger,
        dot: styles.dotDanger,
        badge: "danger" as const,
      };
    default:
      return {
        column: styles.columnNeutral,
        dot: styles.dotNeutral,
        badge: "neutral" as const,
      };
  }
}

const REASON_SUGGESTIONS: Record<"hold" | "cancel" | "rework", string[]> = {
  hold: [
    "Chờ phản hồi/tài liệu từ khách hàng",
    "Tạm dừng để ưu tiên task khẩn cấp",
    "Chờ phụ thuộc kỹ thuật từ nhóm khác",
  ],
  cancel: [
    "Thay đổi phạm vi dự án, không còn cần thiết",
    "Trùng lặp với đầu việc khác đã triển khai",
    "Khách hàng hủy yêu cầu",
  ],
  rework: [
    "Chưa đạt tiêu chí nghiệm thu, cần bổ sung",
    "Cần chỉnh sửa lại giao diện theo Design System",
    "Phát hiện lỗi phát sinh khi kiểm thử",
  ],
};

export function KanbanBoard({
  records,
  filtered,
  pending,
  today,
  onOpen,
  onMove,
}: {
  records: BoardTask[];
  filtered: BoardTask[];
  statuses: readonly string[];
  pending: boolean;
  today: string;
  onOpen: (id: string) => void;
  onMove: (id: string, status: string) => void;
}) {
  const [boardMode, setBoardMode] = useState<BoardMode>("manager");
  const [showCancelled, setShowCancelled] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [alertFilter, setAlertFilter] = useState("");
  const [employeeFocus, setEmployeeFocus] = useState("all");
  const [dragOverLane, setDragOverLane] = useState<string | null>(null);
  const [returnedCardId, setReturnedCardId] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, string>
  >({});
  const [reasonByTask, setReasonByTask] = useState<Record<string, string>>({});
  const [historyByTask, setHistoryByTask] = useState<
    Record<string, StatusHistoryEntry[]>
  >({});
  const [reasonModal, setReasonModal] = useState<PendingReasonState | null>(
    null,
  );
  const [reasonInput, setReasonInput] = useState("");
  const [reasonError, setReasonError] = useState("");
  const laneRefs = useRef<Record<string, HTMLElement | null>>({});

  function getEffectiveLane(record: BoardTask): string {
    return statusOverrides[record.id] || normalizeLane(record.status);
  }

  function getEffectiveReason(record: BoardTask): string | undefined {
    return reasonByTask[record.id] || record.fields.statusReason;
  }

  function getEffectiveHistory(record: BoardTask): StatusHistoryEntry[] {
    return [
      ...(record.fields.statusHistory || []),
      ...(historyByTask[record.id] || []),
    ];
  }

  const assignees = Array.from(
    new Set(records.map((r) => r.assignee.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "vi"));

  const projects = Array.from(
    new Set(
      records.map((r) => (r.fields.project || "").trim()).filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "vi"));

  const activeLanes = KANBAN_LANES.filter(
    (lane) => lane !== "Đã hủy" || showCancelled,
  );

  const boardFiltered = filtered.filter((record) => {
    const lane = getEffectiveLane(record);
    const days = diffDays(record.date, today);
    const isDoneOrCancelled = lane === "Hoàn thành" || lane === "Đã hủy";
    const isOverdue = !isDoneOrCancelled && days < 0;
    const isDueSoon = !isDoneOrCancelled && days >= 0 && days <= 3;
    const isWaitingApproval = lane === "Chờ duyệt";

    if (boardMode === "manager") {
      if (assigneeFilter && record.assignee !== assigneeFilter) return false;
      if (projectFilter && (record.fields.project || "") !== projectFilter)
        return false;
      if (alertFilter === "danger") {
        const highPriority =
          record.fields.priority === "Khẩn cấp" ||
          record.fields.priority === "Cao";
        if (!isOverdue && !highPriority) return false;
      } else if (alertFilter === "warning") {
        if (!isDueSoon && record.fields.priority !== "Trung bình") return false;
      } else if (alertFilter === "approval") {
        if (!isWaitingApproval) return false;
      }
      return true;
    }

    if (employeeFocus === "urgent") {
      return isOverdue || isDueSoon || record.fields.priority === "Khẩn cấp";
    }
    if (employeeFocus === "approval") {
      return isWaitingApproval;
    }
    if (employeeFocus !== "all") {
      return record.assignee === employeeFocus;
    }
    return true;
  });

  const totalCount = boardFiltered.length;
  const inProgressCount = boardFiltered.filter(
    (r) => getEffectiveLane(r) === "Đang thực hiện",
  ).length;
  const waitingApprovalCount = boardFiltered.filter(
    (r) => getEffectiveLane(r) === "Chờ duyệt",
  ).length;
  const completedCount = boardFiltered.filter(
    (r) => getEffectiveLane(r) === "Hoàn thành",
  ).length;
  const onHoldCount = boardFiltered.filter(
    (r) => getEffectiveLane(r) === "Tạm hoãn",
  ).length;
  const cancelledCount = filtered.filter(
    (r) => getEffectiveLane(r) === "Đã hủy",
  ).length;
  const overdueCount = boardFiltered.filter((r) => {
    const lane = getEffectiveLane(r);
    return (
      lane !== "Hoàn thành" && lane !== "Đã hủy" && diffDays(r.date, today) < 0
    );
  }).length;
  const dueSoonCount = boardFiltered.filter((r) => {
    const lane = getEffectiveLane(r);
    const d = diffDays(r.date, today);
    return lane !== "Hoàn thành" && lane !== "Đã hủy" && d >= 0 && d <= 3;
  }).length;

  function triggerSnapBack(taskId: string, message: string) {
    setRuleError(message);
    setReturnedCardId(taskId);
    setTimeout(() => {
      setReturnedCardId((current) => (current === taskId ? null : current));
    }, 600);
  }

  function applyTransition(
    task: BoardTask,
    fromLane: string,
    targetLane: string,
    reason?: string,
  ) {
    const actor =
      boardMode === "manager" ? "Quản lý" : task.assignee || "Nhân viên";
    const entry: StatusHistoryEntry = {
      id: crypto.randomUUID(),
      fromStatus: fromLane,
      toStatus: targetLane,
      actor,
      ...(reason ? { reason } : {}),
      createdAt: new Date().toISOString(),
    };

    setHistoryByTask((prev) => ({
      ...prev,
      [task.id]: [...(prev[task.id] || []), entry],
    }));

    if (reason) {
      setReasonByTask((prev) => ({
        ...prev,
        [task.id]: reason,
      }));
    }

    const backendStatus = toBackendStatus(targetLane);
    if (backendStatus) {
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      if (task.status !== backendStatus) {
        onMove(task.id, backendStatus);
      }
    } else {
      setStatusOverrides((prev) => ({
        ...prev,
        [task.id]: targetLane,
      }));
    }
  }

  function requestTransition(
    task: BoardTask,
    targetRaw: string,
    explicitRework = false,
  ) {
    if (pending) return;
    setRuleError("");
    const fromLane = getEffectiveLane(task);
    const targetLane = normalizeLane(targetRaw);

    if (explicitRework) {
      setReasonInput("");
      setReasonError("");
      setReasonModal({
        task,
        fromLane,
        targetStatus: targetLane,
        actionType: "rework",
      });
      return;
    }

    const check = validateKanbanTransition(fromLane, targetLane, boardMode);
    if (!check.valid) {
      if (check.message) triggerSnapBack(task.id, check.message);
      return;
    }

    if (check.requiresReason) {
      if (targetLane === "Đã hủy" && !showCancelled) {
        setShowCancelled(true);
      }
      setReasonInput("");
      setReasonError("");
      setReasonModal({
        task,
        fromLane,
        targetStatus: targetLane,
        actionType: check.requiresReason,
      });
      return;
    }

    applyTransition(task, fromLane, targetLane);
  }

  function confirmReasonTransition() {
    if (!reasonModal) return;
    const trimmed = reasonInput.trim();
    if (!trimmed) {
      setReasonError(
        "Vui lòng nhập lý do trước khi xác nhận chuyển trạng thái.",
      );
      return;
    }
    if (reasonModal.targetStatus === "Đã hủy" && !showCancelled) {
      setShowCancelled(true);
    }
    applyTransition(
      reasonModal.task,
      reasonModal.fromLane,
      reasonModal.targetStatus,
      trimmed,
    );
    setReasonModal(null);
    setReasonInput("");
    setReasonError("");
  }

  const timelineEntries = boardFiltered
    .flatMap((task) =>
      getEffectiveHistory(task).map((entry) => ({
        ...entry,
        taskId: task.id,
        taskCode: task.code,
        taskName: task.name,
      })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);

  return (
    <div className={styles.wrapper}>
      {/* Thanh chuyển đổi 2 bảng Kanban: Quản lý & Nhân viên + Ẩn/Hiện cột Đã hủy */}
      <div className={styles.topControls}>
        <div
          className={styles.modeTabs}
          role="group"
          aria-label="Chế độ bảng Kanban"
        >
          <button
            type="button"
            className={`${styles.modeTab} ${boardMode === "manager" ? styles.modeTabActive : ""}`}
            aria-pressed={boardMode === "manager"}
            onClick={() => {
              setBoardMode("manager");
              setRuleError("");
            }}
          >
            Bảng Quản lý
          </button>
          <button
            type="button"
            className={`${styles.modeTab} ${boardMode === "employee" ? styles.modeTabActive : ""}`}
            aria-pressed={boardMode === "employee"}
            onClick={() => {
              setBoardMode("employee");
              setRuleError("");
            }}
          >
            Bảng Nhân viên
          </button>
        </div>

        <div className={styles.rightControls}>
          <button
            type="button"
            className={`${styles.toggleBtn} ${showCancelled ? styles.toggleBtnActive : ""}`}
            aria-pressed={showCancelled}
            onClick={() => setShowCancelled((prev) => !prev)}
          >
            {showCancelled
              ? `Ẩn cột Đã hủy (${cancelledCount})`
              : `Hiện cột Đã hủy (${cancelledCount})`}
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${showTimeline ? styles.toggleBtnActive : ""}`}
            aria-pressed={showTimeline}
            onClick={() => setShowTimeline((prev) => !prev)}
          >
            Timeline lịch sử ({timelineEntries.length})
          </button>
        </div>
      </div>

      {/* BẢNG QUẢN LÝ: Thanh tổng quan & Bộ lọc */}
      {boardMode === "manager" ? (
        <>
          <div
            className={styles.overviewGrid}
            aria-label="Thanh tổng quan công việc"
          >
            <div className={styles.overviewCard}>
              <div className={styles.overviewLabel}>
                <span>Tổng công việc</span>
                <Badge variant="neutral" dot>
                  Tổng quan
                </Badge>
              </div>
              <p className={styles.overviewValue}>{totalCount}</p>
              <p className={styles.overviewSub}>
                Hoàn thành{" "}
                {totalCount
                  ? Math.round((completedCount / totalCount) * 100)
                  : 0}
                % ({completedCount}/{totalCount})
              </p>
            </div>

            <div className={styles.overviewCard}>
              <div className={styles.overviewLabel}>
                <span>Đang thực hiện</span>
                <Badge variant="info" dot>
                  Đang làm
                </Badge>
              </div>
              <p className={styles.overviewValue}>{inProgressCount}</p>
              <p className={styles.overviewSub}>
                Tạm hoãn: {onHoldCount} công việc
              </p>
            </div>

            <div className={styles.overviewCard}>
              <div className={styles.overviewLabel}>
                <span>Chờ duyệt</span>
                <Badge variant="warning" dot>
                  Chờ duyệt
                </Badge>
              </div>
              <p className={styles.overviewValue}>{waitingApprovalCount}</p>
              <p className={styles.overviewSub}>
                Cần quản lý kiểm tra & nghiệm thu
              </p>
            </div>

            <div className={styles.overviewCard}>
              <div className={styles.overviewLabel}>
                <span>Quá hạn / Sắp hạn</span>
                <Badge variant="danger" dot>
                  Cảnh báo
                </Badge>
              </div>
              <p className={styles.overviewValue}>
                {overdueCount} / {dueSoonCount}
              </p>
              <p className={styles.overviewSub}>
                {overdueCount} nhãn Đỏ · {dueSoonCount} nhãn Vàng
              </p>
            </div>

            <div className={styles.overviewCard}>
              <div className={styles.overviewLabel}>
                <span>Hoàn thành</span>
                <Badge variant="success" dot>
                  Đã duyệt
                </Badge>
              </div>
              <p className={styles.overviewValue}>{completedCount}</p>
              <p className={styles.overviewSub}>
                Đã hủy: {cancelledCount} (ẩn mặc định)
              </p>
            </div>
          </div>

          <div className={styles.filterBar} aria-label="Bộ lọc Quản lý">
            <div className={styles.filterField}>
              <Select
                aria-label="Lọc người thực hiện"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="">Tất cả người làm</option>
                {assignees.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </Select>
            </div>

            <div className={styles.filterField}>
              <Select
                aria-label="Lọc dự án"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="">Tất cả dự án</option>
                {projects.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </Select>
            </div>

            <div className={styles.filterField}>
              <Select
                aria-label="Lọc cảnh báo hạn"
                value={alertFilter}
                onChange={(e) => setAlertFilter(e.target.value)}
              >
                <option value="">Tất cả nhãn cảnh báo</option>
                <option value="danger">Nhãn Đỏ · Quá hạn / Khẩn cấp</option>
                <option value="warning">Nhãn Vàng · Sắp đến hạn</option>
                <option value="approval">Nhãn Chờ duyệt</option>
              </Select>
            </div>

            {(assigneeFilter || projectFilter || alertFilter) && (
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => {
                  setAssigneeFilter("");
                  setProjectFilter("");
                  setAlertFilter("");
                }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </>
      ) : (
        /* BẢNG NHÂN VIÊN */
        <div
          className={styles.employeeBar}
          aria-label="Bảng làm việc Nhân viên"
        >
          <div className={styles.employeeChips}>
            <button
              type="button"
              className={`${styles.chip} ${employeeFocus === "all" ? styles.chipActive : ""}`}
              onClick={() => setEmployeeFocus("all")}
            >
              Tất cả công việc ({filtered.length})
            </button>
            <button
              type="button"
              className={`${styles.chip} ${employeeFocus === "urgent" ? styles.chipActive : ""}`}
              onClick={() => setEmployeeFocus("urgent")}
            >
              Cần xử lý gấp ({overdueCount + dueSoonCount})
            </button>
            <button
              type="button"
              className={`${styles.chip} ${employeeFocus === "approval" ? styles.chipActive : ""}`}
              onClick={() => setEmployeeFocus("approval")}
            >
              Đang chờ duyệt ({waitingApprovalCount})
            </button>
            {assignees.map((person) => (
              <button
                key={person}
                type="button"
                className={`${styles.chip} ${employeeFocus === person ? styles.chipActive : ""}`}
                onClick={() => setEmployeeFocus(person)}
              >
                {person}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            Luồng Nhân viên: Cần làm → Đang thực hiện → Chờ duyệt (Kéo vào Hoãn
            hoặc bấm Làm lại cần nhập lý do)
          </span>
        </div>
      )}

      {/* Thông báo lỗi khi kéo thả sai luật */}
      {ruleError && (
        <div role="alert" className={styles.ruleBanner}>
          <span>{ruleError}</span>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => setRuleError("")}
          >
            Đã hiểu
          </button>
        </div>
      )}

      {/* Thanh cuộn chọn nhanh cột trên điện thoại */}
      <div
        className={styles.mobileLaneNav}
        aria-label="Di chuyển nhanh tới cột"
      >
        {activeLanes.map((lane) => {
          const count = boardFiltered.filter(
            (r) => getEffectiveLane(r) === lane,
          ).length;
          return (
            <button
              key={lane}
              type="button"
              className={styles.chip}
              onClick={() =>
                laneRefs.current[lane]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "start",
                })
              }
            >
              {lane} ({count})
            </button>
          );
        })}
      </div>

      {/* Bảng các cột Kanban (cuộn ngang trên điện thoại) */}
      <div className={styles.board}>
        {activeLanes.map((lane) => {
          const theme = laneTheme(lane);
          const laneTasks = boardFiltered.filter(
            (record) => getEffectiveLane(record) === lane,
          );
          return (
            <section
              key={lane}
              ref={(el) => {
                laneRefs.current[lane] = el;
              }}
              aria-label={`Cột ${lane}`}
              className={`${styles.column} ${theme.column} ${
                dragOverLane === lane ? styles.columnDragOver : ""
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragOverLane !== lane) setDragOverLane(lane);
              }}
              onDragLeave={() => {
                if (dragOverLane === lane) setDragOverLane(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOverLane(null);
                const draggedId = event.dataTransfer.getData("text/plain");
                const record = records.find((item) => item.id === draggedId);
                if (record && getEffectiveLane(record) !== lane) {
                  requestTransition(record, lane);
                }
              }}
            >
              <header className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>
                  <span className={`${styles.columnDot} ${theme.dot}`} />
                  {lane}
                </h2>
                <span className={styles.columnCount}>{laneTasks.length}</span>
              </header>

              <div className={styles.cardList}>
                {laneTasks.length === 0 ? (
                  <div className={styles.emptyColumn}>
                    Không có thẻ ở cột «{lane}»
                  </div>
                ) : (
                  laneTasks.map((record) => {
                    const days = diffDays(record.date, today);
                    const normalizedStatus = getEffectiveLane(record);
                    const reasonText = getEffectiveReason(record);
                    const isFinished =
                      normalizedStatus === "Hoàn thành" ||
                      normalizedStatus === "Đã hủy";
                    const isOverdue = !isFinished && days < 0;
                    const isDueSoon = !isFinished && days >= 0 && days <= 3;
                    const commentCount = (record.fields.comments || []).length;
                    const priority = record.fields.priority || "Trung bình";

                    return (
                      <article
                        key={record.id}
                        className={`${styles.card} ${
                          returnedCardId === record.id
                            ? styles.cardReturned
                            : ""
                        }`}
                        draggable={!pending}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", record.id);
                        }}
                        onDragEnd={() => setDragOverLane(null)}
                      >
                        {/* Hàng trên: Mã task + Nhãn Đỏ/Vàng kèm chữ + Nhãn Chờ duyệt */}
                        <div className={styles.cardTop}>
                          <span className={styles.cardCode}>{record.code}</span>
                          <div className={styles.badgeGroup}>
                            {isOverdue ? (
                              <Badge variant="danger" dot>
                                Quá hạn {Math.abs(days)} ngày
                              </Badge>
                            ) : isDueSoon ? (
                              <Badge variant="warning" dot>
                                {days === 0
                                  ? "Hạn hôm nay"
                                  : `Sắp đến hạn (${days} ngày)`}
                              </Badge>
                            ) : null}

                            {priority === "Khẩn cấp" || priority === "Cao" ? (
                              <Badge variant="danger" dot>
                                {priority}
                              </Badge>
                            ) : priority === "Trung bình" ? (
                              <Badge variant="warning" dot>
                                Trung bình
                              </Badge>
                            ) : (
                              <Badge variant="neutral" dot>
                                {priority}
                              </Badge>
                            )}

                            {normalizedStatus === "Chờ duyệt" && (
                              <Badge variant="warning" dot>
                                Chờ duyệt
                              </Badge>
                            )}
                            {normalizedStatus === "Tạm hoãn" && (
                              <Badge variant="warning" dot>
                                Tạm hoãn
                              </Badge>
                            )}
                            {normalizedStatus === "Hoàn thành" && (
                              <Badge variant="success" dot>
                                Hoàn thành
                              </Badge>
                            )}
                            {normalizedStatus === "Đã hủy" && (
                              <Badge variant="danger" dot>
                                Đã hủy
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Tên task tối đa 2 dòng */}
                        <button
                          type="button"
                          className={styles.cardTitleBtn}
                          onClick={() => onOpen(record.id)}
                        >
                          <h3 className={styles.cardTitle}>{record.name}</h3>
                        </button>

                        {record.fields.project && (
                          <p className="text-xs text-muted-foreground">
                            Dự án: {record.fields.project}
                          </p>
                        )}

                        {reasonText && (
                          <div className={styles.reasonBox}>
                            Lý do: {reasonText}
                          </div>
                        )}

                        {/* Người làm (Avatar + Tên), Số bình luận, Hạn */}
                        <div className={styles.metaRow}>
                          <div className={styles.assigneeInfo}>
                            <span className={styles.avatar} aria-hidden="true">
                              {getInitials(record.assignee)}
                            </span>
                            <span className={styles.assigneeName}>
                              {record.assignee || "Chưa phân công"}
                            </span>
                          </div>

                          <div className={styles.metaRight}>
                            <button
                              type="button"
                              className={styles.commentBadge}
                              aria-label={`${commentCount} bình luận của ${record.code}`}
                              onClick={() => onOpen(record.id)}
                            >
                              <span>💬</span>
                              <span>{commentCount}</span>
                            </button>
                            <span
                              title={record.date}
                              className={`${styles.deadline} ${
                                isOverdue
                                  ? styles.deadlineOverdue
                                  : isDueSoon
                                    ? styles.deadlineWarning
                                    : ""
                              }`}
                            >
                              Hạn {formatShortDate(record.date)}
                            </span>
                          </div>
                        </div>

                        {/* Cụm nút trạng thái trong thẻ + Select trạng thái */}
                        <div className={styles.cardActions}>
                          <div
                            className={styles.quickButtons}
                            role="group"
                            aria-label={`Thao tác trạng thái ${record.code}`}
                          >
                            {normalizedStatus === "Cần làm" && (
                              <>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                                  onClick={() =>
                                    requestTransition(record, "Đang thực hiện")
                                  }
                                >
                                  Bắt đầu
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={`${styles.actionBtn} ${styles.actionBtnWarning}`}
                                  onClick={() =>
                                    requestTransition(record, "Tạm hoãn")
                                  }
                                >
                                  Hoãn
                                </button>
                                {boardMode === "manager" && (
                                  <button
                                    type="button"
                                    disabled={pending}
                                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                    onClick={() =>
                                      requestTransition(record, "Đã hủy")
                                    }
                                  >
                                    Hủy việc
                                  </button>
                                )}
                              </>
                            )}

                            {normalizedStatus === "Đang thực hiện" && (
                              <>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                                  onClick={() =>
                                    requestTransition(record, "Chờ duyệt")
                                  }
                                >
                                  Gửi duyệt
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={styles.actionBtn}
                                  onClick={() =>
                                    requestTransition(record, "Cần làm", true)
                                  }
                                >
                                  Làm lại
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={`${styles.actionBtn} ${styles.actionBtnWarning}`}
                                  onClick={() =>
                                    requestTransition(record, "Tạm hoãn")
                                  }
                                >
                                  Hoãn
                                </button>
                                {boardMode === "manager" && (
                                  <button
                                    type="button"
                                    disabled={pending}
                                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                    onClick={() =>
                                      requestTransition(record, "Đã hủy")
                                    }
                                  >
                                    Hủy việc
                                  </button>
                                )}
                              </>
                            )}

                            {normalizedStatus === "Chờ duyệt" && (
                              <>
                                {boardMode === "manager" && (
                                  <button
                                    type="button"
                                    disabled={pending}
                                    className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
                                    onClick={() =>
                                      requestTransition(record, "Hoàn thành")
                                    }
                                  >
                                    Duyệt
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={styles.actionBtn}
                                  onClick={() =>
                                    requestTransition(
                                      record,
                                      "Đang thực hiện",
                                      true,
                                    )
                                  }
                                >
                                  Làm lại
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={`${styles.actionBtn} ${styles.actionBtnWarning}`}
                                  onClick={() =>
                                    requestTransition(record, "Tạm hoãn")
                                  }
                                >
                                  Hoãn
                                </button>
                              </>
                            )}

                            {normalizedStatus === "Tạm hoãn" && (
                              <>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                                  onClick={() =>
                                    requestTransition(record, "Đang thực hiện")
                                  }
                                >
                                  Tiếp tục
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className={styles.actionBtn}
                                  onClick={() =>
                                    requestTransition(record, "Cần làm", true)
                                  }
                                >
                                  Làm lại
                                </button>
                                {boardMode === "manager" && (
                                  <button
                                    type="button"
                                    disabled={pending}
                                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                    onClick={() =>
                                      requestTransition(record, "Đã hủy")
                                    }
                                  >
                                    Hủy việc
                                  </button>
                                )}
                              </>
                            )}

                            {(normalizedStatus === "Hoàn thành" ||
                              normalizedStatus === "Đã hủy") && (
                              <button
                                type="button"
                                disabled={pending}
                                className={styles.actionBtn}
                                onClick={() =>
                                  requestTransition(
                                    record,
                                    normalizedStatus === "Đã hủy"
                                      ? "Cần làm"
                                      : "Đang thực hiện",
                                    true,
                                  )
                                }
                              >
                                Làm lại
                              </button>
                            )}
                          </div>

                          <Select
                            aria-label={"Trạng thái " + record.code}
                            value={normalizedStatus}
                            disabled={pending}
                            onChange={(event) =>
                              requestTransition(record, event.target.value)
                            }
                          >
                            {KANBAN_LANES.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Timeline lịch sử trạng thái */}
      {showTimeline && (
        <section
          className={styles.timelineSection}
          aria-label="Timeline lịch sử trạng thái"
        >
          <div className={styles.timelineHeader}>
            <div>
              <h3 className={styles.timelineTitle}>
                Timeline lịch sử trạng thái
              </h3>
              <p className="text-xs text-muted-foreground">
                Theo dõi toàn bộ lượt chuyển cột, người thực hiện và lý do Tạm
                hoãn / Đã hủy / Làm lại.
              </p>
            </div>
            <Badge variant="info" dot>
              {timelineEntries.length} sự kiện gần nhất
            </Badge>
          </div>

          {timelineEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Chưa có lịch sử chuyển trạng thái. Hãy kéo thả thẻ hoặc bấm cụm
              nút trạng thái để ghi nhận timeline.
            </p>
          ) : (
            <ol className={styles.timelineList}>
              {timelineEntries.map((item, idx) => (
                <li key={item.id || idx} className={styles.timelineItem}>
                  {idx < timelineEntries.length - 1 && (
                    <span className={styles.timelineLine} aria-hidden="true" />
                  )}
                  <span className={styles.timelineMarker} aria-hidden="true" />
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineMeta}>
                      <span>
                        <strong>{item.taskCode}</strong> · {item.taskName}
                      </span>
                      <time>{formatDateTime(item.createdAt)}</time>
                    </div>
                    <p className="mt-1 text-xs font-medium text-foreground">
                      Chuyển từ «{item.fromStatus}» sang «{item.toStatus}» ·
                      Thực hiện bởi: {item.actor}
                    </p>
                    {item.reason && (
                      <div className={styles.timelineReason}>
                        <strong>Lý do:</strong> {item.reason}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* Hộp nhập lý do khi kéo vào Hoãn / Hủy hoặc bấm Làm lại */}
      {reasonModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kanban-reason-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setReasonModal(null);
          }}
        >
          <div className={styles.modalDialog}>
            <div className={styles.modalHeader}>
              <h3 id="kanban-reason-title">
                {reasonModal.actionType === "hold"
                  ? "Nhập lý do Tạm hoãn công việc"
                  : reasonModal.actionType === "cancel"
                    ? "Nhập lý do Hủy công việc"
                    : "Nhập lý do Làm lại công việc"}
              </h3>
              <Badge
                variant={
                  reasonModal.actionType === "cancel" ? "danger" : "warning"
                }
                dot
              >
                {reasonModal.fromLane} → {reasonModal.targetStatus}
              </Badge>
            </div>

            <div className={styles.modalBody}>
              <p className="text-xs text-muted-foreground">
                Công việc: <strong>{reasonModal.task.code}</strong> —{" "}
                {reasonModal.task.name}
              </p>

              <div className={styles.suggestionChips}>
                {REASON_SUGGESTIONS[reasonModal.actionType].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={styles.chip}
                      onClick={() => {
                        setReasonInput(suggestion);
                        setReasonError("");
                      }}
                    >
                      + {suggestion}
                    </button>
                  ),
                )}
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-foreground">
                Lý do chuyển trạng thái *
                <Textarea
                  aria-label="Lý do chuyển trạng thái"
                  placeholder="Nhập rõ lý do tạm hoãn, hủy hoặc yêu cầu làm lại…"
                  value={reasonInput}
                  onChange={(e) => {
                    setReasonInput(e.target.value);
                    if (reasonError) setReasonError("");
                  }}
                  rows={3}
                  autoFocus
                />
              </label>

              {reasonError && (
                <p role="alert" className="error">
                  {reasonError}
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setReasonModal(null)}
              >
                Đóng lại
              </button>
              <button
                type="button"
                disabled={pending}
                className={`${styles.actionBtn} ${
                  reasonModal.actionType === "cancel"
                    ? styles.actionBtnDanger
                    : styles.actionBtnPrimary
                }`}
                onClick={confirmReasonTransition}
              >
                Xác nhận lý do
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
