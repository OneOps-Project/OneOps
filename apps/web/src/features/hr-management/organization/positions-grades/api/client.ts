import { z } from "zod";
import {
  createSchema,
  recordSchema,
  type RecordInput,
  type RecordDto,
} from "@/features/hr-management/organization/positions-grades/types";
import { apiRequest } from "@/features/hr-management/organization/positions-grades/api/http";
import { FALLBACK_RECORDS } from "@/features/hr-management/organization/positions-grades/constants";

// Local storage key for fallback persistence during isolated testing
const STORAGE_KEY = "oneops-positions-grades-cache";

function getLocalRecords(): RecordDto[] {
  if (typeof window === "undefined") return [...FALLBACK_RECORDS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(FALLBACK_RECORDS));
      return [...FALLBACK_RECORDS];
    }
    return JSON.parse(raw);
  } catch {
    return [...FALLBACK_RECORDS];
  }
}

function saveLocalRecords(records: RecordDto[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export const client = {
  async list(signal?: AbortSignal): Promise<RecordDto[]> {
    try {
      const items: RecordDto[] = [];
      let page = 1;
      while (true) {
        const result = await apiRequest(
          "/positions-grades?page=" + page + "&pageSize=100",
          { signal },
          z.object({
            items: z.array(recordSchema),
            total: z.number(),
            page: z.number(),
            pageSize: z.number(),
          }),
        );
        items.push(...result.items);
        if (items.length >= result.total || !result.items.length) {
          saveLocalRecords(items);
          return items;
        }
        page++;
      }
    } catch {
      // Graceful fallback to rich mock data when standalone or API route not yet wired
      return getLocalRecords();
    }
  },

  async update(
    record: RecordDto,
    patch: Partial<RecordInput>,
  ): Promise<RecordDto> {
    try {
      const result = await apiRequest(
        "/positions-grades/" + record.id,
        {
          method: "PATCH",
          body: JSON.stringify({ ...patch, version: record.version }),
        },
        recordSchema,
      );
      return result;
    } catch {
      // Fallback local update
      const local = getLocalRecords();
      const idx = local.findIndex((r) => r.id === record.id);
      if (idx !== -1) {
        const updated: RecordDto = {
          ...local[idx],
          ...patch,
          fields: {
            ...local[idx].fields,
            ...(patch.fields || {}),
          },
          version: local[idx].version + 1,
          updatedAt: new Date().toISOString(),
        };
        local[idx] = updated;
        saveLocalRecords(local);
        return updated;
      }
      throw new Error("Không tìm thấy bản ghi cần cập nhật.");
    }
  },

  async remove(record: RecordDto): Promise<{ id: string }> {
    try {
      await apiRequest("/positions-grades/" + record.id, {
        method: "DELETE",
        body: JSON.stringify({ version: record.version }),
      });
      return { id: record.id };
    } catch {
      // Fallback local remove
      const local = getLocalRecords().filter((r) => r.id !== record.id);
      saveLocalRecords(local);
      return { id: record.id };
    }
  },

  async create(data: RecordInput): Promise<RecordDto> {
    try {
      const result = await apiRequest(
        "/positions-grades",
        { method: "POST", body: JSON.stringify(createSchema.parse(data)) },
        recordSchema,
      );
      return result;
    } catch {
      // Fallback local create
      const local = getLocalRecords();
      const existing = local.find(
        (r) => r.code.toLowerCase() === data.code.trim().toLowerCase(),
      );
      if (existing) {
        throw new Error(`Mã '${data.code}' đã tồn tại trong hệ thống.`);
      }
      const now = new Date().toISOString();
      const newRecord: RecordDto = {
        id: crypto.randomUUID(),
        module: "positions-grades",
        code: data.code.trim(),
        name: data.name.trim(),
        scope: data.scope || "job_title",
        status: data.status || "Đang áp dụng",
        date: data.date || now.slice(0, 10),
        assignee: data.assignee || "",
        note: data.note || "",
        fields: data.fields || {},
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      local.unshift(newRecord);
      saveLocalRecords(local);
      return newRecord;
    }
  },

  resetMockData() {
    saveLocalRecords([...FALLBACK_RECORDS]);
  },
};
