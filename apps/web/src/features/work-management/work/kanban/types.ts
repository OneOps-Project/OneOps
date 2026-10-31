export type BoardTask = {
  id: string;
  code: string;
  name: string;
  status: string;
  date: string;
  assignee: string;
  reviewer: string;
  priority?: string;
  project?: string;
  /** Statuses the signed-in actor may move this task to right now. */
  available: string[];
  /** Blocks drag/drop while a proposal is waiting for a manager. */
  locked?: boolean;
  /** Open `BLOCKS` predecessors; the card advertises the wait before a move fails. */
  blocked?: number;
};

export type BoardMove = (taskId: string, toStatus: string) => void;
