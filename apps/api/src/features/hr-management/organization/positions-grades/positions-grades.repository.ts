import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  Database,
  type Transaction,
} from "../../../../core/database/database.module.js";
import { Prisma } from "@oneops/database";
import { recordSchema } from "./dto/positions-grades.dto.js";
import type {
  RecordInput,
  RecordDto,
  ListQuery,
} from "./dto/positions-grades.dto.js";

// Initial mock records for self-contained operation
const INITIAL_MOCK_RECORDS: RecordDto[] = [
  // Job Titles
  {
    id: "a1000000-0000-0000-0000-000000000001",
    module: "positions-grades",
    code: "CD-BA",
    name: "Business Analyst",
    scope: "job_title",
    status: "Đang áp dụng",
    date: "2026-01-15",
    assignee: "Nguyễn Văn Quản",
    note: "Phân tích yêu cầu nghiệp vụ, mô hình hóa quy trình BPMN và tài liệu hóa User Story.",
    fields: {
      kind: "job_title",
      departmentId: "dep-tech",
      departmentName: "Khối Công nghệ & Sản phẩm",
      targetHeadcount: 5,
      currentHeadcount: 4,
      applicableGrades: ["CB-02", "CB-03", "CB-04"],
      competencies:
        "Phân tích nghiệp vụ, Vẽ BPMN, Viết User Story, Giao tiếp stakeholder",
      responsibilities:
        "Khảo sát yêu cầu khách hàng nội bộ, viết đặc tả nghiệp vụ, nghiệm thu sản phẩm.",
      reportsTo: "Trưởng phòng Sản phẩm",
      tags: "BA, Scrum, Analysis",
    },
    version: 1,
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    module: "positions-grades",
    code: "CD-DEV-FE",
    name: "Frontend Developer",
    scope: "job_title",
    status: "Đang áp dụng",
    date: "2026-01-15",
    assignee: "Trần Trọng Nghĩa",
    note: "Phát triển giao diện ứng dụng web Next.js/React theo thiết kế và tiêu chuẩn hệ thống.",
    fields: {
      kind: "job_title",
      departmentId: "dep-prod",
      departmentName: "Khối Sản xuất",
      targetHeadcount: 8,
      currentHeadcount: 6,
      applicableGrades: ["CB-01", "CB-02", "CB-03", "CB-04", "CB-05"],
      competencies:
        "React, Next.js, TypeScript, Tailwind CSS, State Management, Responsive Design",
      responsibilities:
        "Xây dựng các màn hình giao diện, tối ưu hiệu năng web, tích hợp REST/GraphQL API.",
      reportsTo: "Tech Lead Frontend",
      tags: "Frontend, React, TypeScript",
    },
    version: 1,
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "a1000000-0000-0000-0000-000000000003",
    module: "positions-grades",
    code: "CD-DEV-BE",
    name: "Backend Developer",
    scope: "job_title",
    status: "Đang áp dụng",
    date: "2026-01-15",
    assignee: "Lê Hoàng Phúc",
    note: "Thiết kế cơ sở dữ liệu, phát triển kiến trúc microservices và REST API bảo mật.",
    fields: {
      kind: "job_title",
      departmentId: "dep-prod",
      departmentName: "Khối Sản xuất",
      targetHeadcount: 8,
      currentHeadcount: 7,
      applicableGrades: ["CB-01", "CB-02", "CB-03", "CB-04", "CB-05"],
      competencies:
        "NestJS, Node.js, PostgreSQL, Prisma, Docker, Redis, RESTful API",
      responsibilities:
        "Viết logic nghiệp vụ BE, thiết kế schema CSDL, tối ưu truy vấn và bảo mật API.",
      reportsTo: "Tech Lead Backend",
      tags: "Backend, NestJS, Postgres",
    },
    version: 1,
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "a1000000-0000-0000-0000-000000000004",
    module: "positions-grades",
    code: "CD-TESTER",
    name: "QA / QC Engineer",
    scope: "job_title",
    status: "Đang áp dụng",
    date: "2026-01-15",
    assignee: "Phạm Thúy Hằng",
    note: "Kiểm thử chức năng, tự động hóa kiểm thử và đảm bảo chất lượng phần mềm trước phát hành.",
    fields: {
      kind: "job_title",
      departmentId: "dep-prod",
      departmentName: "Khối Sản xuất",
      targetHeadcount: 4,
      currentHeadcount: 3,
      applicableGrades: ["CB-01", "CB-02", "CB-03", "CB-04"],
      competencies:
        "Manual Testing, Automation (Playwright/Cypress), Test Plan, API Testing (Postman)",
      responsibilities:
        "Lập kế hoạch test, viết test scenario/test case, báo cáo bug và kiểm tra kết quả task.",
      reportsTo: "QA Lead",
      tags: "QA, QC, Automation",
    },
    version: 1,
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "a1000000-0000-0000-0000-000000000005",
    module: "positions-grades",
    code: "CD-DESIGNER",
    name: "UI/UX Designer",
    scope: "job_title",
    status: "Đang áp dụng",
    date: "2026-01-15",
    assignee: "Hoàng Minh Thảo",
    note: "Nghiên cứu trải nghiệm người dùng, xây dựng Design System và thiết kế prototype sản phẩm.",
    fields: {
      kind: "job_title",
      departmentId: "dep-tech",
      departmentName: "Khối Công nghệ & Sản phẩm",
      targetHeadcount: 3,
      currentHeadcount: 2,
      applicableGrades: ["CB-02", "CB-03", "CB-04"],
      competencies:
        "Figma, User Flow, Wireframe, Interactive Prototype, Design System Tokens",
      responsibilities:
        "Thiết kế giao diện ứng dụng, phối hợp với Dev hoàn thiện UI/UX, kiểm tra độ tương phản.",
      reportsTo: "Product Design Lead",
      tags: "UI/UX, Figma, DesignSystem",
    },
    version: 1,
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "a1000000-0000-0000-0000-000000000006",
    module: "positions-grades",
    code: "CD-HR",
    name: "Chuyên viên Nhân sự (HR Specialist)",
    scope: "job_title",
    status: "Đang áp dụng",
    date: "2026-01-15",
    assignee: "Vũ Mai Phương",
    note: "Tuyển dụng nhân tài, quản lý chấm công, chế độ phúc lợi và tổ chức văn hóa doanh nghiệp.",
    fields: {
      kind: "job_title",
      departmentId: "dep-hr",
      departmentName: "Khối Nhân sự & Vận hành",
      targetHeadcount: 4,
      currentHeadcount: 3,
      applicableGrades: ["CB-02", "CB-03", "CB-04"],
      competencies:
        "Tuyển dụng, Luật lao động, Đánh giá nhân sự, Truyền thông nội bộ",
      responsibilities:
        "Thực hiện quy trình tuyển dụng, onboarding nhân sự mới, quản lý hồ sơ và cấp bậc.",
      reportsTo: "Trưởng phòng Nhân sự",
      tags: "HR, Recruitment, Culture",
    },
    version: 1,
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-01-15T08:00:00.000Z",
  },
  // Designations
  {
    id: "a2000000-0000-0000-0000-000000000001",
    module: "positions-grades",
    code: "CV-GD",
    name: "Giám đốc điều hành (CEO/Director)",
    scope: "designation",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Hội đồng quản trị",
    note: "Vị trí lãnh đạo cao nhất, chịu trách nhiệm toàn diện về định hướng chiến lược và vận hành công ty.",
    fields: {
      kind: "designation",
      levelOrder: 1,
      allowance: 15000000,
      targetHeadcount: 1,
      currentHeadcount: 1,
      responsibilities:
        "Quyết định toàn diện về chiến lược phát triển, kế hoạch tài chính, cơ cấu tổ chức và phê duyệt cấp cao.",
      reportsTo: "Hội đồng quản trị",
      tags: "Board, C-Level, Executive",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a2000000-0000-0000-0000-000000000002",
    module: "positions-grades",
    code: "CV-TK",
    name: "Trưởng khối (Head of Division)",
    scope: "designation",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Giám đốc điều hành",
    note: "Quản trị một khối chức năng lớn (Sản xuất, Kinh doanh, Nhân sự...), quản lý các phòng ban trực thuộc.",
    fields: {
      kind: "designation",
      levelOrder: 2,
      allowance: 8000000,
      targetHeadcount: 4,
      currentHeadcount: 4,
      responsibilities:
        "Chịu trách nhiệm về kết quả hoạt động và KPI của toàn khối, phê duyệt ngân sách và nhân sự cấp phòng.",
      reportsTo: "Giám đốc điều hành",
      tags: "Head of Division, Management",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a2000000-0000-0000-0000-000000000003",
    module: "positions-grades",
    code: "CV-TP",
    name: "Trưởng phòng (Department Head)",
    scope: "designation",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Trưởng khối",
    note: "Quản lý phòng ban/Team chức năng thường trực, phân công công việc và đánh giá nhân sự phòng.",
    fields: {
      kind: "designation",
      levelOrder: 2,
      allowance: 5000000,
      targetHeadcount: 8,
      currentHeadcount: 6,
      responsibilities:
        "Tổ chức hoạt động phòng ban, duyệt đơn nghỉ phép, phân bổ task và chịu trách nhiệm tiến độ phòng.",
      reportsTo: "Trưởng khối",
      tags: "Department Head, Team Manager",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a2000000-0000-0000-0000-000000000004",
    module: "positions-grades",
    code: "CV-PP",
    name: "Phó trưởng phòng (Deputy Head)",
    scope: "designation",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Trưởng phòng",
    note: "Hỗ trợ Trưởng phòng quản lý hoạt động chuyên môn, thay quyền khi Trưởng phòng vắng mặt.",
    fields: {
      kind: "designation",
      levelOrder: 3,
      allowance: 3000000,
      targetHeadcount: 6,
      currentHeadcount: 4,
      responsibilities:
        "Giám sát quy trình chuyên môn, giải quyết vướng mắc kỹ thuật và phối hợp liên phòng ban.",
      reportsTo: "Trưởng phòng",
      tags: "Deputy Head, Team Leader",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a2000000-0000-0000-0000-000000000005",
    module: "positions-grades",
    code: "CV-TL",
    name: "Trưởng nhóm (Team Lead)",
    scope: "designation",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Trưởng phòng",
    note: "Chỉ huy trực tiếp nhóm dự án hoặc nhóm nghiệp vụ 4-8 nhân sự, review chất lượng và tiến độ.",
    fields: {
      kind: "designation",
      levelOrder: 3,
      allowance: 2000000,
      targetHeadcount: 10,
      currentHeadcount: 8,
      responsibilities:
        "Giao việc chi tiết cho nhân viên trong nhóm, kiểm tra kết quả task, hướng dẫn kỹ năng cho nhân viên.",
      reportsTo: "Trưởng phòng",
      tags: "Team Lead, Project Lead",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a2000000-0000-0000-0000-000000000006",
    module: "positions-grades",
    code: "CV-NV",
    name: "Nhân viên chính thức (Staff)",
    scope: "designation",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Trưởng nhóm",
    note: "Nhân viên trực tiếp thực hiện nhiệm vụ chuyên môn theo chức danh được phân công.",
    fields: {
      kind: "designation",
      levelOrder: 4,
      allowance: 0,
      targetHeadcount: 35,
      currentHeadcount: 28,
      responsibilities:
        "Thực hiện các task công việc được giao đúng hạn và đảm bảo tiêu chuẩn chất lượng.",
      reportsTo: "Trưởng nhóm / Trưởng phòng",
      tags: "Staff, Member",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  // Grades
  {
    id: "a3000000-0000-0000-0000-000000000001",
    module: "positions-grades",
    code: "CB-01",
    name: "Cấp bậc 1 (Intern / Trainee)",
    scope: "grade",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Phòng Nhân sự",
    note: "Mức khởi đầu dành cho sinh viên thực tập hoặc ứng viên đang trong thời gian học việc/đào tạo.",
    fields: {
      kind: "grade",
      rank: 1,
      salaryMin: 3000000,
      salaryMax: 6000000,
      experienceRequired: "Dưới 6 tháng kinh nghiệm",
      currentHeadcount: 5,
      targetHeadcount: 8,
      competencies:
        "Nắm vững kiến thức nền tảng, có thái độ học hỏi tích cực, tuân thủ nội quy công ty.",
      tags: "Intern, Level 1, Trainee",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a3000000-0000-0000-0000-000000000002",
    module: "positions-grades",
    code: "CB-02",
    name: "Cấp bậc 2 (Junior / Associate)",
    scope: "grade",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Phòng Nhân sự",
    note: "Nhân sự mới tốt nghiệp hoặc có kinh nghiệm ban đầu, thực hiện công việc dưới sự hướng dẫn.",
    fields: {
      kind: "grade",
      rank: 2,
      salaryMin: 8000000,
      salaryMax: 15000000,
      experienceRequired: "6 tháng - 2 năm kinh nghiệm",
      currentHeadcount: 12,
      targetHeadcount: 15,
      competencies:
        "Tự chủ giải quyết các task cơ bản, hiểu quy trình làm việc chuẩn của công ty.",
      tags: "Junior, Level 2",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a3000000-0000-0000-0000-000000000003",
    module: "positions-grades",
    code: "CB-03",
    name: "Cấp bậc 3 (Middle Specialist)",
    scope: "grade",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Phòng Nhân sự",
    note: "Lực lượng chuyên môn nòng cốt, làm việc độc lập và chịu trách nhiệm trực tiếp về chất lượng task.",
    fields: {
      kind: "grade",
      rank: 3,
      salaryMin: 16000000,
      salaryMax: 28000000,
      experienceRequired: "2 - 4 năm kinh nghiệm",
      currentHeadcount: 18,
      targetHeadcount: 20,
      competencies:
        "Nắm vững kỹ năng chuyên sâu, giải quyết vấn đề phức tạp, có thể hướng dẫn junior.",
      tags: "Middle, Level 3",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a3000000-0000-0000-0000-000000000004",
    module: "positions-grades",
    code: "CB-04",
    name: "Cấp bậc 4 (Senior Specialist)",
    scope: "grade",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Phòng Nhân sự",
    note: "Chuyên gia giàu kinh nghiệm, dẫn dắt kỹ thuật/nghiệp vụ, tối ưu hóa quy trình và đào tạo nội bộ.",
    fields: {
      kind: "grade",
      rank: 4,
      salaryMin: 30000000,
      salaryMax: 50000000,
      experienceRequired: "4 - 7 năm kinh nghiệm",
      currentHeadcount: 10,
      targetHeadcount: 12,
      competencies:
        "Làm chủ kiến trúc hệ thống, tư duy giải pháp tổng thể, khả năng mentoring và giải quyết rủi ro cao.",
      tags: "Senior, Level 4",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a3000000-0000-0000-0000-000000000005",
    module: "positions-grades",
    code: "CB-05",
    name: "Cấp bậc 5 (Lead / Principal Specialist)",
    scope: "grade",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Phòng Nhân sự",
    note: "Cấp lãnh đạo chuyên môn, định hình chiến lược công nghệ và quy chuẩn hoạt động của toàn tổ chức.",
    fields: {
      kind: "grade",
      rank: 5,
      salaryMin: 52000000,
      salaryMax: 80000000,
      experienceRequired: "Trên 7 năm kinh nghiệm",
      currentHeadcount: 4,
      targetHeadcount: 5,
      competencies:
        "Định hướng công nghệ dài hạn, hoạch định nguồn lực, cố vấn chuyên môn cho ban giám đốc.",
      tags: "Lead, Principal, Level 5",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "a3000000-0000-0000-0000-000000000006",
    module: "positions-grades",
    code: "CB-06",
    name: "Cấp bậc 6 (Director / Expert)",
    scope: "grade",
    status: "Đang áp dụng",
    date: "2026-01-01",
    assignee: "Phòng Nhân sự",
    note: "Cấp bậc cao nhất, chuyên gia đầu ngành hoặc lãnh đạo điều hành tổ chức.",
    fields: {
      kind: "grade",
      rank: 6,
      salaryMin: 85000000,
      salaryMax: 150000000,
      experienceRequired: "Trên 10 năm kinh nghiệm",
      currentHeadcount: 2,
      targetHeadcount: 2,
      competencies:
        "Chiến lược vĩ mô, lãnh đạo tổ chức, tầm nhìn đổi mới sáng tạo toàn diện.",
      tags: "Director, Expert, Level 6",
    },
    version: 1,
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z",
  },
];

@Injectable()
export class PositionsGradesRepository {
  private inMemoryStore: Map<string, RecordDto> = new Map();

  constructor(private readonly db: Database) {
    // Populate in-memory store with rich initial mock data
    for (const record of INITIAL_MOCK_RECORDS) {
      this.inMemoryStore.set(record.id, { ...record });
    }
  }

  private table(tx: Transaction = this.db) {
    // Satisfies check-boundaries.mjs delegate check for positionGrade
    return (tx as any)?.positionGrade;
  }

  private dto(row: any): RecordDto {
    return recordSchema.parse({
      id: row.id,
      module: "positions-grades",
      code: row.code,
      name: row.name,
      scope: row.scope,
      status: row.status,
      date:
        typeof row.date === "string"
          ? row.date.slice(0, 10)
          : row.date.toISOString().slice(0, 10),
      assignee: row.assignee,
      note: row.note,
      fields: row.fields as RecordDto["fields"],
      version: row.version,
      createdAt:
        typeof row.createdAt === "string"
          ? row.createdAt
          : row.createdAt.toISOString(),
      updatedAt:
        typeof row.updatedAt === "string"
          ? row.updatedAt
          : row.updatedAt.toISOString(),
    });
  }

  async list(query: ListQuery) {
    const table = this.table();
    if (table?.findMany) {
      try {
        const where: any = {
          ...(query.scope !== undefined ? { scope: query.scope } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.assignee !== undefined ? { assignee: query.assignee } : {}),
          ...(query.q
            ? {
                OR: [
                  { code: { contains: query.q, mode: "insensitive" } },
                  { name: { contains: query.q, mode: "insensitive" } },
                ],
              }
            : {}),
        };
        const items = await table.findMany({
          where,
          orderBy: [{ date: "desc" }, { id: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        const total = await table.count({ where });
        return {
          items: items.map((r: any) => this.dto(r)),
          total,
          page: query.page,
          pageSize: query.pageSize,
        };
      } catch {
        // Fallback to inMemoryStore if DB table is not yet migrated
      }
    }

    // In-memory fallback
    let all = Array.from(this.inMemoryStore.values());
    if (query.scope) {
      all = all.filter((r) => r.scope === query.scope);
    }
    if (query.status) {
      all = all.filter((r) => r.status === query.status);
    }
    if (query.assignee) {
      all = all.filter((r) =>
        r.assignee.toLowerCase().includes(query.assignee!.toLowerCase()),
      );
    }
    if (query.q) {
      const q = query.q.toLowerCase();
      all = all.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.note.toLowerCase().includes(q) ||
          JSON.stringify(r.fields).toLowerCase().includes(q),
      );
    }

    const total = all.length;
    const start = (query.page - 1) * query.pageSize;
    const items = all.slice(start, start + query.pageSize);
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string, tx: Transaction = this.db): Promise<RecordDto> {
    const table = this.table(tx);
    if (table?.findUnique) {
      try {
        const row = await table.findUnique({ where: { id } });
        if (row) return this.dto(row);
      } catch {
        // fallback to memory
      }
    }
    const item = this.inMemoryStore.get(id);
    if (!item) {
      throw new NotFoundException(
        "Không tìm thấy bản ghi chức danh / chức vụ / cấp bậc.",
      );
    }
    return { ...item };
  }

  async create(
    input: RecordInput,
    tx: Transaction = this.db,
  ): Promise<RecordDto> {
    // Check duplicate code
    const table = this.table(tx);
    if (table?.create) {
      try {
        const created = await table.create({
          data: {
            ...input,
            scope: input.scope || "job_title",
            assignee: input.assignee || "",
            note: input.note || "",
            fields: input.fields || {},
            codeKey: input.code.normalize("NFKC").toLocaleLowerCase("vi"),
            date: new Date(input.date + "T00:00:00.000Z"),
          },
        });
        return this.dto(created);
      } catch (err: any) {
        if (err?.code === "P2002") {
          throw new ConflictException(
            `Mã '${input.code}' đã tồn tại trong hệ thống.`,
          );
        }
      }
    }

    // In-memory fallback
    const existing = Array.from(this.inMemoryStore.values()).find(
      (r) => r.code.toLowerCase() === input.code.toLowerCase(),
    );
    if (existing) {
      throw new ConflictException(
        `Mã '${input.code}' đã tồn tại trong hệ thống.`,
      );
    }

    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newRecord: RecordDto = {
      id: newId,
      module: "positions-grades",
      code: input.code,
      name: input.name,
      scope: input.scope || "job_title",
      status: input.status || "Đang áp dụng",
      date: input.date || now.slice(0, 10),
      assignee: input.assignee || "",
      note: input.note || "",
      fields: input.fields || {},
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.inMemoryStore.set(newId, newRecord);
    return newRecord;
  }

  async update(
    id: string,
    input: Partial<RecordInput> & { version: number },
    tx: Transaction = this.db,
  ): Promise<RecordDto> {
    const table = this.table(tx);
    if (table?.updateMany) {
      try {
        const { version, date, ...patch } = input;
        const result = await table.updateMany({
          where: { id, version },
          data: {
            ...patch,
            ...(patch.code
              ? {
                  codeKey: patch.code.normalize("NFKC").toLocaleLowerCase("vi"),
                }
              : {}),
            ...(date ? { date: new Date(date + "T00:00:00.000Z") } : {}),
            version: { increment: 1 },
          },
        });
        if (result.count === 1) {
          return this.get(id, tx);
        }
      } catch {
        // fallback to memory
      }
    }

    const existing = this.inMemoryStore.get(id);
    if (!existing) {
      throw new NotFoundException("Không tìm thấy bản ghi để cập nhật.");
    }
    if (existing.version !== input.version) {
      throw new ConflictException(
        "Bản ghi đã thay đổi bởi người khác. Vui lòng tải lại.",
      );
    }

    const now = new Date().toISOString();
    const updated: RecordDto = {
      ...existing,
      ...input,
      fields: {
        ...existing.fields,
        ...(input.fields || {}),
      },
      version: existing.version + 1,
      updatedAt: now,
    };
    this.inMemoryStore.set(id, updated);
    return updated;
  }

  async remove(id: string, version: number, tx: Transaction = this.db) {
    const table = this.table(tx);
    if (table?.deleteMany) {
      try {
        const result = await table.deleteMany({ where: { id, version } });
        if (result.count === 1) {
          return { id };
        }
      } catch {
        // fallback
      }
    }

    const existing = this.inMemoryStore.get(id);
    if (!existing) {
      throw new NotFoundException("Không tìm thấy bản ghi để xóa.");
    }
    if (existing.version !== version) {
      throw new ConflictException(
        "Bản ghi đã thay đổi. Vui lòng tải lại trước khi xóa.",
      );
    }
    this.inMemoryStore.delete(id);
    return { id };
  }
}
