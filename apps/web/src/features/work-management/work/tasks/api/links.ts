import {
  blockerResponseSchema,
  linkInput,
  linkViewSchema,
  neighborhoodSchema,
  type BlockerEntry,
  type LinkInput,
  type TaskLink,
  type TaskNeighborhood,
} from "@/features/work-management/work/tasks/types";
import { apiRequest } from "@/features/work-management/work/tasks/api/http";

export const links = {
  neighborhood: (
    taskId: string,
    signal?: AbortSignal,
  ): Promise<TaskNeighborhood> =>
    apiRequest(`/task-links?taskId=${taskId}`, { signal }, neighborhoodSchema),
  async blockers(
    taskIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<BlockerEntry[]> {
    if (!taskIds.length) return [];
    const ids = encodeURIComponent(taskIds.slice(0, 200).join(","));
    const result = await apiRequest(
      `/task-links/blockers?taskIds=${ids}`,
      { signal },
      blockerResponseSchema,
    );
    return result.items;
  },
  create: (input: LinkInput): Promise<TaskLink> =>
    apiRequest(
      "/task-links",
      { method: "POST", body: JSON.stringify(linkInput.parse(input)) },
      linkViewSchema,
    ),
  remove: (id: string) =>
    apiRequest<{ id: string }>(`/task-links/${id}`, { method: "DELETE" }),
};
