export const TASK_DIRECTORY = "oneops:task-directory";

/** The part of a task a link needs: identity, label and the status that decides blocking. */
export interface TaskRef {
  id: string;
  code: string;
  name: string;
  status: string;
  assignee: string;
}

/**
 * Task read model for links. The links feature never reads task rows itself, so
 * the main composition binds this port to the public tasks service.
 */
export interface TaskDirectoryPort {
  get(taskId: string): Promise<TaskRef>;
  /** Missing ids are omitted, so stale links degrade instead of failing a page. */
  find(taskIds: readonly string[]): Promise<TaskRef[]>;
}
