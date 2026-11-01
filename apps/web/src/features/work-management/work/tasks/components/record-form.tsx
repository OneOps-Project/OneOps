"use client";
import { useState, useEffect } from "react";
import {
  validatedCreateSchema as createSchema,
  type RecordDto,
} from "@/features/work-management/work/tasks/types";
import {
  definition,
  fields,
} from "@/features/work-management/work/tasks/constants";
import { client } from "@/features/work-management/work/tasks/api/client";
import { recordsChanged } from "@/features/work-management/work/tasks/hooks/use-records";
import { useWorkspace } from "@/features/work-management/work/tasks/components/primitives/workspace";
import { Button } from "@/features/work-management/work/tasks/components/primitives/button";
import {
  Input,
  Select,
  Textarea,
} from "@/features/work-management/work/tasks/components/primitives/forms";

export function RecordForm({
  record,
  onClose,
}: {
  record?: RecordDto;
  onClose: () => void;
}) {
  const { notify } = useWorkspace();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [assignee, setAssignee] = useState(record?.assignee ?? "");
  const [reviewer, setReviewer] = useState(record?.reviewer ?? "");
  const [taskName, setTaskName] = useState(record?.name ?? "");
  const [similarTasks, setSimilarTasks] = useState<RecordDto[]>([]);
  const [checkingSimilar, setCheckingSimilar] = useState(false);
  const [attachmentLinks, setAttachmentLinks] = useState<string[]>(
    record?.attachmentLinks ?? [],
  );
  const [newLink, setNewLink] = useState("");

  // ROUND1-2: Kiểm tra task trùng khi nhập tên + assignee (BR-TSK-03)
  useEffect(() => {
    if (record) return; // Chỉ check khi tạo mới
    const timer = setTimeout(async () => {
      if (assignee.length >= 2 && taskName.length >= 3) {
        setCheckingSimilar(true);
        try {
          const similar = await client.checkSimilarTasks(assignee, taskName);
          setSimilarTasks(similar);
        } catch {
          setSimilarTasks([]);
        } finally {
          setCheckingSimilar(false);
        }
      } else {
        setSimilarTasks([]);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [assignee, taskName, record]);

  const reviewerError =
    reviewer && assignee && reviewer === assignee
      ? "Người kiểm tra phải khác người phụ trách"
      : "";

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        if (reviewerError) {
          setError(reviewerError);
          return;
        }
        const data = new FormData(event.currentTarget);

        // Xây dựng extra fields
        const extra: Record<string, unknown> = { ...record?.fields };
        for (const field of fields) {
          const raw = String(data.get("field:" + field.key) || "").trim();
          if (raw !== "")
            extra[field.key] = field.type === "number" ? Number(raw) : raw;
          else delete extra[field.key];
        }

        // Deadline datetime
        const deadlineDate = String(data.get("deadline-date") || "").trim();
        const deadlineTime = String(data.get("deadline-time") || "17:00").trim();
        let deadline: string | undefined;
        if (deadlineDate) {
          const dt = new Date(`${deadlineDate}T${deadlineTime}:00+07:00`);
          if (!isNaN(dt.getTime())) deadline = dt.toISOString();
        }

        const parsed = createSchema.safeParse({
          code: String(data.get("code") || "").trim(),
          name: String(data.get("name") || "").trim(),
          date: String(data.get("date")),
          status: record ? record.status : "Cần làm",
          assignee: assignee.trim(),
          reviewer: reviewer.trim(),
          deadline,
          attachmentLinks,
          note: String(data.get("note") || "").trim(),
          scope: record?.scope || "",
          fields: extra,
        });

        if (!parsed.success) {
          const firstIssue = parsed.error.issues[0];
          setError(firstIssue?.message || "Kiểm tra thông tin nhập");
          return;
        }

        setPending(true);
        setError("");
        try {
          if (record) await client.update(record, parsed.data);
          else await client.create(parsed.data);
          recordsChanged();
          notify(record ? "Đã cập nhật thành công." : "Đã tạo thành công.");
          onClose();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Không thể lưu dữ liệu");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="form-body">
        {/* Mã + Ngày */}
        <div className="form-grid">
          <label>
            Mã <span aria-hidden="true" className="text-destructive">*</span>
            <Input
              name="code"
              required
              maxLength={100}
              defaultValue={record?.code}
              placeholder="VD: WORK-001"
            />
          </label>
          <label>
            {definition.dateLabel}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
            <Input
              name="date"
              type="date"
              required
              defaultValue={
                record?.date ||
                new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date())
              }
            />
          </label>
        </div>

        {/* Tên task */}
        <label>
          Tiêu đề <span aria-hidden="true" className="text-destructive">*</span>
          <Input
            name="name"
            required
            maxLength={150}
            defaultValue={record?.name}
            placeholder={"Nhập tên " + definition.singular}
            onChange={(e) => setTaskName(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">Tối đa 150 ký tự</span>
        </label>

        {/* Người phụ trách + Người kiểm tra (BR-TSK-01) */}
        <div className="form-grid">
          <label>
            {definition.personLabel}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
            <Input
              name="assignee"
              required
              maxLength={150}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Người phụ trách"
            />
          </label>
          <div>
            <label>
              {definition.reviewerLabel}
              <Input
                name="reviewer"
                maxLength={150}
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder="Người kiểm tra (mặc định là người tạo)"
                aria-describedby={reviewerError ? "reviewer-error" : undefined}
                aria-invalid={!!reviewerError}
              />
            </label>
            {reviewerError && (
              <p id="reviewer-error" className="mt-1 text-sm text-destructive" role="alert">
                {reviewerError}
              </p>
            )}
          </div>
        </div>

        {/* Deadline (ngày + giờ) — spec 8.2 */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Deadline{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
          </legend>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Ngày deadline</span>
              <Input
                name="deadline-date"
                type="date"
                required
                defaultValue={
                  record?.deadline
                    ? new Date(record.deadline)
                        .toISOString()
                        .slice(0, 10)
                    : new Intl.DateTimeFormat("en-CA", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      }).format(new Date())
                }
              />
            </label>
            <label className="flex-1">
              <span className="sr-only">Giờ deadline</span>
              <Input
                name="deadline-time"
                type="time"
                required
                defaultValue={
                  record?.deadline
                    ? new Date(record.deadline)
                        .toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Ho_Chi_Minh",
                        })
                    : "17:00"
                }
              />
            </label>
          </div>
        </fieldset>

        {/* Cảnh báo task trùng — BR-TSK-03 (không chặn) */}
        {checkingSimilar && (
          <p className="text-sm text-muted-foreground" role="status">
            Đang kiểm tra task trùng…
          </p>
        )}
        {!record && similarTasks.length > 0 && (
          <div
            className="rounded-control border border-yellow-400 bg-yellow-50 p-3 dark:border-yellow-600 dark:bg-yellow-950/30"
            role="alert"
            aria-label="Cảnh báo task tương tự"
          >
            <p className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-300">
              ⚠️ Nhân viên này đã có {similarTasks.length} task chưa xong tên tương tự:
            </p>
            <ul className="space-y-1">
              {similarTasks.map((task) => (
                <li key={task.id} className="text-sm text-yellow-700 dark:text-yellow-400">
                  <span className="font-mono font-medium">{task.code}</span>: {task.name}{" "}
                  <span className="text-muted-foreground">({task.status})</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-500">
              Bạn vẫn có thể tiếp tục tạo task mới.
            </p>
          </div>
        )}

        {/* Độ ưu tiên - spec 8.2 */}
        <label>
          Độ ưu tiên
          <Select
            name="field:priority"
            defaultValue={
              (record?.fields?.priority as string | undefined) ?? "Trung bình"
            }
          >
            <option value="Thấp">Thấp</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Cao">Cao</option>
            <option value="Khẩn cấp">Khẩn cấp</option>
          </Select>
        </label>

        {/* Mô tả */}
        <label>
          Mô tả
          <Textarea
            name="note"
            maxLength={2000}
            rows={3}
            defaultValue={record?.note}
            placeholder="Nhập mô tả chi tiết…"
          />
        </label>

        {/* Link đính kèm — spec 8.2 */}
        <div>
          <p className="mb-2 text-sm font-medium">Link đính kèm</p>
          <div className="space-y-2">
            {attachmentLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm text-primary underline"
                >
                  {link}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAttachmentLinks(attachmentLinks.filter((_, i) => i !== idx))
                  }
                  aria-label={`Xóa link ${link}`}
                >
                  Xóa
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://…"
                type="url"
                className="flex-1"
                aria-label="URL link đính kèm"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!newLink || attachmentLinks.length >= 50}
                onClick={() => {
                  try {
                    new URL(newLink);
                    setAttachmentLinks([...attachmentLinks, newLink]);
                    setNewLink("");
                  } catch {
                    /* URL không hợp lệ, không thêm */
                  }
                }}
              >
                Thêm link
              </Button>
            </div>
          </div>
        </div>

        {/* Lỗi form */}
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
        <Button
          type="submit"
          disabled={pending || !!reviewerError}
          aria-busy={pending}
        >
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo mới"}
        </Button>
      </footer>
    </form>
  );
}
