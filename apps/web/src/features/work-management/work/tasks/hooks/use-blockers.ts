"use client";
import { useCallback, useEffect, useState } from "react";
import { links } from "@/features/work-management/work/tasks/api/links";
import type { BlockerEntry } from "@/features/work-management/work/tasks/types";

export type BlockerMap = ReadonlyMap<string, BlockerEntry>;

const empty: BlockerMap = new Map();

/**
 * Open blockers per card. The board shows the count instead of guessing from
 * the status, and the same numbers drive the start gate in the detail panel.
 */
export function useBlockers(taskIds: readonly string[]) {
  const ids = taskIds.join(",");
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ map: BlockerMap; key: string }>({
    map: empty,
    key: "",
  });
  const key = `${ids}:${revision}`;
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    links
      .blockers(ids.split(","), controller.signal)
      .then((items) =>
        setState({
          map: new Map(items.map((entry) => [entry.taskId, entry])),
          key,
        }),
      )
      // A missing count is not worth an error banner; the cards simply hide it.
      .catch(() => setState({ map: empty, key }));
    return () => controller.abort();
  }, [ids, key]);

  return { map: state.map, loading: Boolean(ids) && state.key !== key, reload };
}
