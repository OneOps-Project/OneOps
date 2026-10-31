/**
 * What the sprint board needs to know about a task. The work-management main
 * composition backs this port with the tasks feature, so the project spaces
 * never import a sibling feature.
 */
export interface SprintTaskSnapshot {
  id: string;
  code: string;
  name: string;
  status: string;
  assignee: string;
}

export const SPRINT_TASKS = "SPRINT_TASKS";

export interface SprintTaskPort {
  /** Resolves the tasks behind backlog rows; unknown ids are left out. */
  snapshots(taskIds: readonly string[]): Promise<SprintTaskSnapshot[]>;

  /** Tasks that may still be pulled into a project backlog. */
  candidates(
    scope: string,
    excludeTaskIds: readonly string[],
  ): Promise<SprintTaskSnapshot[]>;
}
