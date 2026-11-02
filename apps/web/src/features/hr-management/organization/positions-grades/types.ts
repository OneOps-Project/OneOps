import { z } from "zod";

export const recordInput = z
  .object({
    code: z.string().trim().min(1, "Mã bắt buộc phải nhập").max(100),
    name: z.string().trim().min(1, "Tên bắt buộc phải nhập").max(500),
    scope: z.enum(["job_title", "designation", "grade"]).default("job_title"),
    status: z.enum(["Đang áp dụng", "Ngừng áp dụng"]).default("Đang áp dụng"),
    date: z
      .string()
      .trim()
      .default(() => new Date().toISOString().slice(0, 10)),
    assignee: z.string().trim().max(150).default(""),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();

export const recordPatch = recordInput
  .omit({ scope: true, assignee: true, note: true })
  .partial()
  .extend({
    scope: z.enum(["job_title", "designation", "grade"]).optional(),
    assignee: z.string().trim().max(150).optional(),
    note: z.string().trim().max(2000).optional(),
  });

export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(100),
    q: z.string().trim().max(500).optional(),
    scope: z.string().max(250).optional(),
    status: z.string().max(150).optional(),
    assignee: z.string().trim().max(150).optional(),
  })
  .strict();

export const versionSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export const fieldsSchema = z
  .object({
    kind: z.enum(["job_title", "designation", "grade"]).optional(),
    departmentId: z.string().trim().max(100).optional(),
    departmentName: z.string().trim().max(250).optional(),
    rank: z.number().int().min(1).max(100).optional(),
    levelOrder: z.number().int().min(1).max(20).optional(),
    salaryMin: z.number().min(0).max(10000000000).optional(),
    salaryMax: z.number().min(0).max(10000000000).optional(),
    targetHeadcount: z.number().int().min(0).max(10000).optional(),
    currentHeadcount: z.number().int().min(0).max(10000).optional(),
    allowance: z.number().min(0).max(1000000000).optional(),
    experienceRequired: z.string().trim().max(500).optional(),
    competencies: z.string().trim().max(2000).optional(),
    responsibilities: z.string().trim().max(2000).optional(),
    applicableGrades: z.array(z.string().trim().max(100)).max(50).optional(),
    reportsTo: z.string().trim().max(150).optional(),
    tags: z.string().trim().max(500).optional(),
  })
  .strict();

export const createSchema = recordInput.extend({
  fields: fieldsSchema.default({}),
});

export const updateSchema = recordPatch
  .extend({
    fields: fieldsSchema.optional(),
    version: z.number().int().positive(),
  })
  .strict();

export const recordSchema = createSchema.extend({
  id: z.string().uuid(),
  module: z.literal("positions-grades"),
  version: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const validatedCreateSchema = createSchema.refine(
  (val) => {
    if (
      val.fields?.salaryMin !== undefined &&
      val.fields?.salaryMax !== undefined
    ) {
      return val.fields.salaryMin <= val.fields.salaryMax;
    }
    return true;
  },
  {
    message: "Khung lương tối thiểu không được lớn hơn khung lương tối đa",
    path: ["fields", "salaryMin"],
  },
);

export type RecordInput = z.input<typeof createSchema>;
export type RecordOutput = z.infer<typeof recordSchema>;
export type RecordDto = RecordOutput;
export type ListQuery = z.infer<typeof listQuery>;

// Mock Employee and Department types for external data isolation
export interface MockDepartment {
  id: string;
  code: string;
  name: string;
  manager: string;
  headcount: number;
}

export interface MockEmployee {
  id: string;
  code: string;
  fullName: string;
  avatar: string;
  email: string;
  departmentName: string;
  positionCode: string; // Chức danh
  positionName: string;
  designationCode: string; // Chức vụ
  designationName: string;
  gradeCode: string; // Cấp bậc
  gradeName: string;
  status: "Đang làm việc" | "Nghỉ phép" | "Thực tập";
  joinDate: string;
}
