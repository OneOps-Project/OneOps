export type StatusHistoryEntry = {
  id: string;
  fromStatus: string;
  toStatus: string;
  actor: string;
  reason?: string;
  createdAt: string;
};

export type TaskCommentItem = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

export type TaskChecklistItem = {
  id: string;
  title: string;
  done: boolean;
};

export type BoardMode = "manager" | "employee";

export type MoveOptions = {
  reason?: string;
  actor?: string;
};

export type BoardTask = {
  id: string;
  code: string;
  name: string;
  status: string;
  date: string;
  assignee: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  fields: {
    priority?: string;
    project?: string;
    progress?: number;
    startDate?: string;
    tags?: string;
    statusReason?: string;
    comments?: TaskCommentItem[];
    checklist?: TaskChecklistItem[];
    statusHistory?: StatusHistoryEntry[];
  };
};
