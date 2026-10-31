export const TASK_BLOCKERS = "oneops:task-blockers";

/** An unfinished predecessor that keeps a task from being started. */
export interface BlockerRef {
  id: string;
  code: string;
  name: string;
  status: string;
}

/**
 * Dependency read model. The workflow refuses to start a task while a `BLOCKS`
 * predecessor is still open, but links live in their own feature, so the main
 * composition binds this port to the public links service.
 */
export interface TaskBlockersPort {
  openBlockers(taskId: string): Promise<BlockerRef[]>;
  openBlockersMany(
    taskIds: readonly string[],
  ): Promise<Map<string, BlockerRef[]>>;
}
