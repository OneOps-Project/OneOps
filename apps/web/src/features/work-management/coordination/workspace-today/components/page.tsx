"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Compass,
  FolderKanban,
  ListChecks,
  Pin,
  RefreshCw,
  Sparkles,
  Workflow,
} from "lucide-react";
import { client } from "@/features/work-management/coordination/workspace-today/api/client";
import {
  useModuleRecords,
  recordsChanged,
} from "@/features/work-management/coordination/workspace-today/hooks/use-records";
import { useWorkspace } from "@/features/work-management/coordination/workspace-today/components/primitives/workspace";
import { Button } from "@/features/work-management/coordination/workspace-today/components/primitives/button";
import styles from "@/features/work-management/coordination/workspace-today/components/styles.module.css";

const statusTone: Record<string, string> = {
  "Đang làm": "info",
  "Chờ kiểm tra": "warning",
  "Làm lại": "warning",
  "Hoàn thành": "success",
  "Đã hủy": "danger",
};

const value = (input?: number) => (input === undefined ? "—" : input);
const today = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
}).format(new Date());

const steps = [
  {
    title: "Nắm việc của mình trong một màn",
    body: "Lọc theo người thực hiện, hạn chót và trạng thái.",
    href: "/work-management/tasks",
    action: "Mở bảng công việc",
  },
  {
    title: "Chấm công và gửi đơn nghỉ",
    body: "Chấm công vào ca, gửi nghỉ phép, theo dõi kết quả duyệt.",
    href: "/hr-management/attendance",
    action: "Chấm công hôm nay",
  },
  {
    title: "Để hệ thống nhắc thay bạn",
    body: "Quy tắc tự động thông báo khi công việc đổi trạng thái.",
    href: "/tenant-system/workflow-rules",
    action: "Xem quy tắc tự động",
  },
];

export function ModulePage() {
  const [summary, setSummary] = useState<Awaited<
      ReturnType<typeof client.summary>
    > | null>(null),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const { records } = useModuleRecords();
  const { openCreate } = useWorkspace();
  useEffect(() => {
    const controller = new AbortController();
    client
      .summary(controller.signal)
      .then((result) => {
        setSummary(result);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Không tải được tổng quan");
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [revision]);

  const loading = !summary && !error;
  const openTasks = summary ? summary.totalTasks - summary.completedTasks : 0;
  const overdue = summary?.overdueTasks ?? 0;
  const rate = Math.max(0, Math.min(100, summary?.completionRate ?? 0));
  const pins = records.filter((record) => record.status === "Đang dùng");
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="page">
      <section className="hero bento-12" aria-labelledby="workspace-title">
        <div className="hero-copy">
          <span className="eyebrow">Tổng quan · {today}</span>
          <h1 id="workspace-title">Không gian làm việc</h1>
          <p className="hero-lede">
            Việc gì cần xử lý trước, ai đang phụ trách và tiến độ của đội trong
            hôm nay — tất cả trên một màn.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <Link href="/work-management/tasks">
                Mở bảng công việc
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => {
                setBusy(true);
                setRevision((current) => current + 1);
              }}
            >
              <RefreshCw aria-hidden="true" />
              Làm mới số liệu
            </Button>
          </div>
        </div>
        <div className={styles.focus} aria-busy={loading}>
          <span className={styles.focusLabel}>Cần xử lý trước</span>
          <p
            className={styles.focusValue}
            data-tone={overdue > 0 ? "danger" : "calm"}
          >
            {loading ? (
              <span
                className={`skeleton ${styles.skeletonValue}`}
                aria-hidden="true"
              />
            ) : (
              value(summary?.overdueTasks)
            )}
          </p>
          <p className={styles.focusNote}>
            {summary
              ? overdue > 0
                ? "công việc đã qua hạn hoàn thành"
                : "Không có công việc nào quá hạn"
              : "Đang tổng hợp số liệu…"}
          </p>
          {overdue > 0 ? (
            <Link
              className={styles.focusLink}
              href="/work-management/tasks?status=Cần làm"
            >
              Xem danh sách quá hạn
            </Link>
          ) : (
            <span className={styles.focusQuiet}>Đội đang đúng hạn</span>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <div className="bento">
        <section className="widget bento-4" aria-labelledby="tempo-title">
          <header className="widget-head">
            <div className="widget-heading">
              <span className="widget-icon" data-tone="violet">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="widget-title" id="tempo-title">
                  Nhịp hoàn thành
                </h2>
                <p className="widget-note">Tỷ lệ công việc đã đóng</p>
              </div>
            </div>
          </header>
          <div className={styles.tempoBody}>
            <div
              className="progress-ring"
              role="img"
              aria-label={
                loading
                  ? "Đang tải tỷ lệ hoàn thành"
                  : `Tỷ lệ hoàn thành ${rate}%`
              }
            >
              <svg width="132" height="132" viewBox="0 0 132 132">
                <circle className="progress-track" cx="66" cy="66" r="52" />
                <circle
                  className="progress-value"
                  cx="66"
                  cy="66"
                  r="52"
                  stroke="var(--brand-600)"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - rate / 100)}
                />
              </svg>
              <span className="progress-center">
                <strong>{loading ? "…" : `${rate}%`}</strong>
                <span>hoàn thành</span>
              </span>
            </div>
            <dl className={styles.tempoLegend}>
              <div>
                <dt>Đã xong</dt>
                <dd>{loading ? "…" : value(summary?.completedTasks)}</dd>
              </div>
              <div>
                <dt>Tổng việc</dt>
                <dd>{loading ? "…" : value(summary?.totalTasks)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="widget bento-8" aria-labelledby="watch-title">
          <header className="widget-head">
            <div className="widget-heading">
              <span className="widget-icon">
                <ListChecks className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="widget-title" id="watch-title">
                  Việc cần quan tâm
                </h2>
                <p className="widget-note">
                  {loading
                    ? "Đang tải…"
                    : summary?.tasks.length
                      ? `${summary.tasks.length} việc còn mở`
                      : "Chưa có việc nào"}
                </p>
              </div>
            </div>
            <Link className="widget-link" href="/work-management/tasks">
              Tất cả công việc
            </Link>
          </header>
          {loading ? (
            <div className={styles.list} aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <div className={styles.row} key={row}>
                  <span className={`skeleton ${styles.skeletonRow}`} />
                </div>
              ))}
            </div>
          ) : summary?.tasks.length ? (
            <ul className={styles.list}>
              {summary.tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={
                      "/work-management/tasks?q=" +
                      encodeURIComponent(task.name)
                    }
                    className={styles.row}
                  >
                    <span className={styles.rowMain}>{task.name}</span>
                    <span className={styles.rowMeta}>
                      {task.assignee || "Chưa phân công"}
                    </span>
                    <span className={styles.rowDate}>{task.date}</span>
                    <span
                      className={styles.tone}
                      data-tone={statusTone[task.status] ?? "neutral"}
                    >
                      {task.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.blank}>
              <p>Chưa có công việc đang mở.</p>
              <Button variant="secondary" size="sm" onClick={openCreate}>
                Tạo công việc đầu tiên
              </Button>
            </div>
          )}
        </section>

        <section className="widget bento-5" aria-labelledby="pins-title">
          <header className="widget-head">
            <div className="widget-heading">
              <span className="widget-icon" data-tone="cyan">
                <Pin className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="widget-title" id="pins-title">
                  Ghim của tôi
                </h2>
                <p className="widget-note">Lối tắt dùng hằng ngày</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={openCreate}>
              Thêm
            </Button>
          </header>
          {pins.length ? (
            <ul className={styles.list}>
              {pins.map((record) => (
                <li className={styles.row} key={record.id}>
                  <a
                    className={styles.rowMain}
                    href={record.fields.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {record.name}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await client.remove(record);
                        recordsChanged();
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Không thể bỏ ghim",
                        );
                      }
                    }}
                  >
                    Bỏ ghim
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.blank}>
              <p>Chưa ghim đường dẫn nào.</p>
              <Button variant="secondary" size="sm" onClick={openCreate}>
                Ghim liên kết
              </Button>
            </div>
          )}
        </section>

        <section className="widget bento-7" aria-labelledby="signals-title">
          <header className="widget-head">
            <div className="widget-heading">
              <span className="widget-icon" data-tone="rose">
                <CircleAlert className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="widget-title" id="signals-title">
                  Tín hiệu trong ngày
                </h2>
                <p className="widget-note">
                  Ba con số quyết định buổi sáng của bạn
                </p>
              </div>
            </div>
          </header>
          <dl className={styles.signals}>
            <div className={styles.signal}>
              <dt>
                <ListChecks className="size-3.5" aria-hidden="true" />
                Đang mở
              </dt>
              <dd>
                <Link href="/work-management/tasks">
                  {loading ? (
                    <span
                      className={`skeleton ${styles.skeletonInline}`}
                      aria-hidden="true"
                    />
                  ) : (
                    value(summary ? openTasks : undefined)
                  )}
                </Link>
              </dd>
            </div>
            <div className={styles.signal}>
              <dt>
                <Workflow className="size-3.5" aria-hidden="true" />
                Đề xuất chờ duyệt
              </dt>
              <dd>
                <Link href="/work-management/requests">
                  {loading ? (
                    <span
                      className={`skeleton ${styles.skeletonInline}`}
                      aria-hidden="true"
                    />
                  ) : (
                    value(summary?.pendingRequests)
                  )}
                </Link>
              </dd>
            </div>
            <div className={styles.signal}>
              <dt>
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Lịch hôm nay
              </dt>
              <dd>
                <Link href="/work-management/calendar">
                  {loading ? (
                    <span
                      className={`skeleton ${styles.skeletonInline}`}
                      aria-hidden="true"
                    />
                  ) : (
                    value(summary?.todayEvents)
                  )}
                </Link>
              </dd>
            </div>
            <div className={styles.signal}>
              <dt>
                <FolderKanban className="size-3.5" aria-hidden="true" />
                Dự án đang chạy
              </dt>
              <dd>
                <Link href="/work-management/projects">
                  {loading ? (
                    <span
                      className={`skeleton ${styles.skeletonInline}`}
                      aria-hidden="true"
                    />
                  ) : (
                    value(summary?.projects)
                  )}
                </Link>
              </dd>
            </div>
          </dl>
        </section>

        <section className="widget bento-12" aria-labelledby="start-title">
          <header className="widget-head">
            <div className="widget-heading">
              <span className="widget-icon">
                <Compass className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="widget-title" id="start-title">
                  Bắt đầu trong 3 bước
                </h2>
                <p className="widget-note">Lộ trình cho người mới</p>
              </div>
            </div>
          </header>
          <div className="widget-body">
            <ol className="onboard-list">
              {steps.map((step, index) => (
                <li className="onboard-step" key={step.title}>
                  <span className="onboard-marker" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="onboard-body">
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                    <Link href={step.href}>{step.action}</Link>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <footer className="widget-foot">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.dispatchEvent(new Event("oneops:tour"))}
            >
              Xem hướng dẫn 4 bước
            </Button>
            <span className={styles.footNote}>Mở lại bất cứ lúc nào</span>
          </footer>
        </section>
      </div>

      <p className="page-footnote">
        {summary
          ? `Tỷ lệ hoàn thành ${summary.completionRate}% · cập nhật ${new Date(
              summary.updatedAt,
            ).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "Số liệu sẽ hiển thị khi tải xong."}
      </p>
    </div>
  );
}
