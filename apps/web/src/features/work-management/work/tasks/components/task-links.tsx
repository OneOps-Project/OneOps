"use client";
import { useMemo, useState, type FormEvent } from "react";
import type {
  LinkType,
  RecordDto,
  TaskLink,
  TaskStatus,
} from "@/features/work-management/work/tasks/types";
import { statusTone } from "@/features/work-management/work/tasks/constants";
import { links } from "@/features/work-management/work/tasks/api/links";
import { useTaskLinks } from "@/features/work-management/work/tasks/hooks/use-task-links";
import { recordsChanged } from "@/features/work-management/work/tasks/hooks/use-records";
import { useWorkspace } from "@/features/work-management/work/tasks/components/primitives/workspace";
import { Button } from "@/features/work-management/work/tasks/components/primitives/button";
import { Badge } from "@/features/work-management/work/tasks/components/primitives/foundations";
import {
  Input,
  Select,
} from "@/features/work-management/work/tasks/components/primitives/forms";
import styles from "@/features/work-management/work/tasks/components/styles.module.css";

const typeLabel: Record<LinkType, string> = {
  BLOCKS: "Chặn",
  RELATES_TO: "Liên quan",
  DUPLICATES: "Trùng lặp",
};

const tone = (status: string) => statusTone[status as TaskStatus] ?? "neutral";

const matches = (record: RecordDto, needle: string) =>
  !needle ||
  `${record.code} ${record.name}`.toLocaleLowerCase("vi").includes(needle);

/**
 * Dependency manager for one task. `BLOCKS` is directional and is the only type
 * the API gates on, so the form asks which way the arrow points.
 */
export function TaskLinks({
  task,
  candidates,
  onChanged,
}: {
  task: RecordDto;
  /** Other tasks the actor may link to; the page already holds this list. */
  candidates: readonly RecordDto[];
  onChanged?: () => void;
}) {
  const { notify } = useWorkspace();
  const { data, error, loading, reload } = useTaskLinks(task.id);
  const [type, setType] = useState<LinkType>("BLOCKS");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [needle, setNeedle] = useState("");
  const [targetId, setTargetId] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");

  const needleText = needle.trim().toLocaleLowerCase("vi");
  const options = useMemo(
    () => candidates.filter((item) => matches(item, needleText)).slice(0, 40),
    [candidates, needleText],
  );

  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const blockedBy = incoming.filter((link) => link.type === "BLOCKS");
  const blocks = outgoing.filter((link) => link.type === "BLOCKS");
  const related = [...incoming, ...outgoing].filter(
    (link) => link.type === "RELATES_TO",
  );
  const duplicates = [...incoming, ...outgoing].filter(
    (link) => link.type === "DUPLICATES",
  );

  const refresh = () => {
    reload();
    recordsChanged();
    onChanged?.();
  };

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !targetId) return;
    setPending(true);
    setFailure("");
    const away = direction === "out";
    try {
      await links.create({
        fromTaskId: away ? task.id : targetId,
        toTaskId: away ? targetId : task.id,
        type,
      });
      notify(
        type === "BLOCKS"
          ? away
            ? "Đã đánh dấu công việc này đang chặn việc kia."
            : "Đã ghi nhận việc kia đang chặn công việc này."
          : "Đã thêm liên kết.",
      );
      setTargetId("");
      setNeedle("");
      refresh();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể thêm liên kết.",
      );
    } finally {
      setPending(false);
    }
  }

  async function remove(link: TaskLink) {
    if (pending) return;
    setPending(true);
    setFailure("");
    try {
      await links.remove(link.id);
      notify("Đã gỡ liên kết.");
      refresh();
    } catch (cause) {
      setFailure(
        cause instanceof Error ? cause.message : "Không thể gỡ liên kết.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-label="Liên kết và phụ thuộc">
      <h3>
        Liên kết &amp; phụ thuộc
        {blockedBy.length > 0 && (
          <Badge variant="warning" className="ml-2">
            chờ {blockedBy.length} việc
          </Badge>
        )}
      </h3>

      {loading ? (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Đang tải liên kết…
        </p>
      ) : error ? (
        <p role="alert" className={styles.error}>
          {error}
          <Button variant="ghost" size="sm" onClick={reload}>
            Thử lại
          </Button>
        </p>
      ) : (
        <div className={styles.linkGroups}>
          <LinkGroup
            title="Đang chờ hoàn tất"
            emptyHint="Không có công việc nào chặn."
            items={blockedBy}
            pending={pending}
            onRemove={remove}
          />
          <LinkGroup
            title="Công việc này đang chặn"
            emptyHint="Chưa chặn công việc nào."
            items={blocks}
            pending={pending}
            onRemove={remove}
          />
          {related.length > 0 && (
            <LinkGroup
              title="Liên quan"
              items={related}
              pending={pending}
              onRemove={remove}
            />
          )}
          {duplicates.length > 0 && (
            <LinkGroup
              title="Trùng lặp"
              items={duplicates}
              pending={pending}
              onRemove={remove}
            />
          )}
        </div>
      )}

      <form
        className={styles.linkForm}
        aria-label="Thêm liên kết"
        onSubmit={add}
      >
        <p className="text-sm font-medium">Thêm liên kết</p>
        <Select
          aria-label="Loại liên kết"
          value={type}
          onChange={(event) => setType(event.target.value as LinkType)}
        >
          {Object.entries(typeLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {type === "BLOCKS" && (
          <Select
            aria-label="Chiều phụ thuộc"
            value={direction}
            onChange={(event) =>
              setDirection(event.target.value === "in" ? "in" : "out")
            }
          >
            <option value="out">Công việc này chặn việc kia</option>
            <option value="in">Việc kia chặn công việc này</option>
          </Select>
        )}
        <Input
          aria-label="Lọc công việc để liên kết"
          placeholder="Lọc theo mã hoặc tiêu đề…"
          value={needle}
          onChange={(event) => setNeedle(event.target.value)}
        />
        <Select
          aria-label="Chọn công việc để liên kết"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
        >
          <option value="">Chọn công việc…</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {item.name}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          variant="secondary"
          disabled={!targetId}
          loading={pending}
        >
          Thêm liên kết
        </Button>
      </form>
      {!options.length && needleText && (
        <p className="text-sm text-muted-foreground">
          Không tìm thấy công việc phù hợp.
        </p>
      )}
      {failure && (
        <p role="alert" className={styles.error}>
          {failure}
        </p>
      )}
    </section>
  );
}

function LinkGroup({
  title,
  items,
  emptyHint,
  pending,
  onRemove,
}: {
  title: string;
  items: readonly TaskLink[];
  emptyHint?: string;
  pending: boolean;
  onRemove: (link: TaskLink) => void;
}) {
  return (
    <div className={styles.linkGroup}>
      <p className={styles.linkGroupTitle}>{title}</p>
      {items.length ? (
        <ul className={styles.linkList}>
          {items.map((link) => (
            <li key={link.id}>
              <span className={styles.linkCode}>{link.counterpart.code}</span>
              <span className={styles.linkName}>{link.counterpart.name}</span>
              <Badge variant={tone(link.counterpart.status)} dot>
                {link.counterpart.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={`Gỡ liên kết với ${link.counterpart.code}`}
                onClick={() => onRemove(link)}
              >
                Gỡ
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        emptyHint && (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        )
      )}
    </div>
  );
}
