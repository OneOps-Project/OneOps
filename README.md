# OneOps — Nền Tảng Điều Hành & Quản Lý Doanh Nghiệp Hợp Nhất

> **OneOps** (One-stop Operations Management Platform) là hệ thống quản trị vận hành doanh nghiệp toàn diện, tích hợp chặt chẽ giữa **Quản trị hệ thống (Tenant System)**, **Quản lý nhân sự (HR Management)**, **Điều phối công việc (Work Management)** và **Quản lý quan hệ khách hàng (CRM)** trên nền tảng kiến trúc Monorepo hiện đại, an toàn và có khả năng mở rộng cao.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Ngăn xếp công nghệ (Tech Stack)](#2-ngăn-xếp-công-nghệ-tech-stack)
3. [Kiến trúc, Sơ đồ tương tác & Ranh giới phân hệ](#3-kiến-trúc-sơ-đồ-tương-tác--ranh-giới-phân-hệ)
4. [Danh mục 29 chức năng dữ liệu đã triển khai](#4-danh-mục-29-chức-năng-dữ-liệu-đã-triển-khai)
5. [Quy tắc nghiệp vụ cốt lõi & Cơ chế an toàn](#5-quy-tắc-nghiệp-vụ-cốt-lõi--cơ-chế-an-toàn)
6. [Hướng dẫn cài đặt & Khởi động nhanh](#6-hướng-dẫn-cài-đặt--khởi-động-nhanh)
7. [Hướng dẫn sử dụng hệ thống (User Guide)](#7-hướng-dẫn-sử-dụng-hệ-thống-user-guide)
8. [Hệ thống Design Tokens & Tùy biến Theme](#8-hệ-thống-design-tokens--tùy-biến-theme)
9. [Bộ lệnh phát triển & Cổng kiểm tra chất lượng](#9-bộ-lệnh-phát-triển--cổng-kiểm-tra-chất-lượng)
10. [Quy tắc phát triển & Hướng dẫn phối hợp AI](#10-quy-tắc-phát-triển--hướng-dẫn-phối-hợp-ai)

---

## 1. Tổng quan hệ thống

OneOps được thiết kế nhằm giải quyết bài toán phân mảnh dữ liệu trong doanh nghiệp, quy tụ mọi luồng nghiệp vụ hàng ngày về một không gian làm việc số thống nhất:

- **Quản trị hệ thống & Chính sách vận hành (Tenant System):** Định danh tổ chức, phiên làm việc an toàn với sliding-window, phân quyền vai trò (RBAC), kiểm soát tài khoản, chính sách giờ làm việc & mạng nội bộ (`work-policies`), và nhật ký kiểm toán bất biến (`checklog`).
- **Quản trị nhân lực toàn diện (HR Management - Hoàn thiện 100%):** Sơ đồ tổ chức phòng ban phân cấp không chu trình, chức danh ngạch bậc, hồ sơ nhân sự, điểm danh hàng ngày (`daily-checkin`), giải trình vi phạm (`checkin-explanations`), bảng theo dõi quân số hiện diện (`workforce-board`), quản lý ca kíp (`shifts-schedules`), chốt công kỳ hạn (`attendance-reports`), luồng xin & duyệt nghỉ phép (`leave-requests` & `leave-approvals`), và quản lý công suất định biên nhân sự (`resource-capacity`).
- **Không gian điều hành công việc linh hoạt (Work Management):** Bảng tổng quan cá nhân hóa ("Workspace Today"), lịch làm việc, quản lý công việc với bảng Kanban trực quan, máy trạng thái công việc (Task State Machine), bình luận trao đổi, dự án, mốc tiến độ & cổng kiểm định chất lượng (QA Gate), chấm công thời gian thực (Timesheets), hệ thống đề xuất & duyệt (Approvals), ghi chú SOP nội bộ và trung tâm thông báo thời gian thực qua Server-Sent Events (SSE).
- **Chuẩn bị mở rộng kinh doanh (CRM):** Cấu trúc sẵn sàng cho quy trình tiền bán hàng (Leads/Briefs), hợp đồng thương mại (Quotations/Contracts) và chăm sóc khách hàng sau bán (Customer Portal).

---

## 2. Ngăn xếp công nghệ (Tech Stack)

| Tầng hệ thống        | Công nghệ chủ đạo            | Phiên bản & Đặc điểm                                                                                                   |
| :------------------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Monorepo**         | npm Workspaces               | Quản lý đồng bộ giữa `apps/*` và `packages/*`                                                                          |
| **Frontend Web**     | Next.js, React, Tailwind CSS | **Next.js 16.4.3** (App Router, React 19), Tailwind CSS v4, Radix UI Primitives, CSS Modules cục bộ                    |
| **Backend API**      | NestJS, TypeScript, Node.js  | **NestJS 11**, Node.js ≥ 22.12.0, Zod DTO Validation, Server-Sent Events (SSE), Session sliding-window                 |
| **Database & ORM**   | PostgreSQL, Prisma ORM       | **PostgreSQL 16+**, **Prisma 7.10.1** với multi-schema database federation (46 models), Optimistic Concurrency Control |
| **Design System**    | OneOps Token Studio          | **187 semantic tokens**, hỗ trợ Light/Dark themes, Comfortable/Compact density                                         |
| **Sơ đồ tri thức**   | Graphify Engine              | **4.978 nodes**, **13.126 edges**, **169 communities**, xuất Call-flow HTML & Wiki tự động                             |
| **Kiểm thử tự động** | Node Test Runner, Playwright | **26/26 API integration tests đạt**, Playwright 1.64.1 (E2E)                                                           |

---

## 3. Kiến trúc, Sơ đồ tương tác & Ranh giới phân hệ

Hệ thống tuân thủ nghiêm ngặt **Kiến trúc Lục giác (Hexagonal / Clean Architecture)** và nguyên tắc cô lập ranh giới chức năng (**Strict Feature Boundaries**).

```text
oneops/
├── apps/
│   ├── web/                           # Next.js App Router (Port 3002 - 26 navigation modules)
│   │   └── src/
│   │       ├── app/                   # Route mỏng (render public components)
│   │       ├── core/                  # Hạ tầng web, Shell, Feature Registry, Design System
│   │       └── features/              # 39 feature folders tự sở hữu UI/Hooks/API clients
│   │           ├── tenant-system/     # Xác thực, tài khoản, phân quyền, checklog, chính sách
│   │           ├── hr-management/     # 11/11 modules nhân sự hoàn thiện
│   │           ├── work-management/   # 12 modules điều phối & cộng tác công việc
│   │           └── crm/               # Phân hệ quan hệ khách hàng (sẵn sàng mở rộng)
│   └── api/                           # NestJS Backend API (Port 4000)
│       └── src/
│           ├── core/                  # Guard phiên, Exception filters, Event emitter
│           └── features/              # Feature modules tự sở hữu Controller/Service/Repo/Prisma
│               ├── tenant-system/
│               ├── hr-management/
│               ├── work-management/
│               └── crm/
├── packages/
│   └── database/                      # Prisma schema base, migrations và generated client (46 models)
├── graphify-out/                      # Sơ đồ kiến trúc & tương tác tri thức toàn hệ thống
│   ├── OneOps-callflow.html           # Sơ đồ Call-flow Mermaid tương tác (17 sections, 16 diagrams)
│   ├── graph.html                     # Bản đồ tri thức tương tác 3D (4.978 nodes, 13.126 edges)
│   ├── GRAPH_REPORT.md                # Báo cáo phân tích cấu trúc cộng đồng hệ thống
│   └── wiki/                          # 179 bài viết tài liệu hóa kiến trúc mã nguồn
├── tokens/                            # Single source of truth cho design tokens (source.json)
└── scripts/                           # Bộ công cụ build tokens, check boundaries, dev server
```

### Sơ đồ kiến trúc tương tác Graphify

Hệ thống được trích xuất sơ đồ tương tác tự động thông qua công cụ **Graphify**:

- **Trực quan hóa Call-flow:** Mở tệp `graphify-out/OneOps-callflow.html` trên trình duyệt để khám phá 16 sơ đồ tuần tự (Sequence / Architecture diagrams) chi tiết theo từng ca làm việc, quy trình duyệt đơn, máy trạng thái công việc và luồng kiểm toán.
- **Bản đồ quan hệ hệ thống:** Tệp `graphify-out/graph.html` thể hiện mạng lưới liên kết giữa 4.978 thực thể mã nguồn và 169 cụm chức năng.

### Nguyên tắc ranh giới bất biến (Immutable Invariants)

1. **Không import chéo giữa các Leaf Feature:** Mỗi feature tự định nghĩa UI, primitives, hook, HTTP client, types, DTO, service, repository và model Prisma của chính nó. Không tạo "shared business component", generic CRUD factory hay base repository dùng chung.
2. **Tích hợp liên phân hệ qua Composition Module:** Khi cần điều phối nghiệp vụ giữa các chức năng, sử dụng Composition Service ở tầng domain (ví dụ: `work-management.composition.ts`, `hr-management.leaves.service.ts`, `hr-management.capacity.service.ts`, `permission-audit.ts`), gọi thông qua public interfaces đã được kiểm soát.
3. **Chỉ Repository chạm Database:** Controller chỉ xử lý HTTP; Service chỉ xử lý nghiệp vụ thuần túy; duy nhất Repository được phép import `@oneops/database` và truy vấn database delegate.
4. **Không tạo file placeholder:** Các chức năng chưa làm phải được để trống hoàn toàn; không sinh API giả hoặc file rỗng để "làm đẹp" cây thư mục.

---

## 4. Danh mục 29 chức năng dữ liệu đã triển khai

Hệ thống OneOps hiện sở hữu **29 chức năng dữ liệu hoàn chỉnh** với **46 models Prisma** được bảo vệ phân quyền và lưu trữ an toàn:

| STT | Phân hệ (Domain)  | Tên chức năng              | Đường dẫn Feature                       | Route Web                            | Schema Database           | Model Prisma sở hữu                                        |
| :-: | :---------------- | :------------------------- | :-------------------------------------- | :----------------------------------- | :------------------------ | :--------------------------------------------------------- |
|  1  | `tenant-system`   | **Xác thực phiên**         | `access-control/tenant-auth`            | `/tenant-system/auth`                | `tenant_auth`             | `TenantSession`                                            |
|  2  | `tenant-system`   | **Quản lý tài khoản**      | `access-control/accounts`               | `/tenant-system/accounts`            | `tenant_accounts`         | `TenantAccount`                                            |
|  3  | `tenant-system`   | **Vai trò & Quyền hạn**    | `access-control/roles-permissions`      | `/tenant-system/roles-permissions`   | `tenant_permissions`      | `TenantRole`, `TenantRoleBinding`                          |
|  4  | `tenant-system`   | **Nhật ký kiểm toán**      | `checklog`                              | `/tenant-system/checklog`            | `tenant_checklog`         | `AuditChecklog`                                            |
|  5  | `tenant-system`   | **Chính sách vận hành**    | `organization/work-policies`            | `/tenant-system/work-policies`       | `tenant_policies`         | `WorkPolicy`, `WorkHoliday`, `OfficeNetwork`, `LeaveQuota` |
|  6  | `hr-management`   | **Phòng ban & Đội ngũ**    | `organization/departments-teams`        | `/hr-management/organization`        | `hr_departments`          | `HrDepartment`                                             |
|  7  | `hr-management`   | **Chức danh & Ngạch bậc**  | `organization/positions-grades`         | `/hr-management/positions`           | `hr_positions`            | `HrPosition`                                               |
|  8  | `hr-management`   | **Hồ sơ nhân sự**          | `employees/employee-directory`          | `/hr-management/employees`           | `hr_employees`            | `HrEmployee`                                               |
|  9  | `hr-management`   | **Công suất định biên**    | `employees/resource-capacity`           | `/hr-management/capacity`            | `hr_capacity`             | `CapacityPeriod`, `ProjectAllocation`                      |
| 10  | `hr-management`   | **Điểm danh hàng ngày**    | `attendance/daily-checkin`              | `/hr-management/attendance`          | `hr_attendance`           | `AttendanceRecord`                                         |
| 11  | `hr-management`   | **Bảng quân số hiện diện** | `attendance/workforce-board`            | `/hr-management/workforce`           | `hr_workforce`            | `WorkforcePresence`                                        |
| 12  | `hr-management`   | **Giải trình điểm danh**   | `attendance/checkin-explanations`       | `/hr-management/explanations`        | `hr_checkin_explanations` | `CheckinExplanation`                                       |
| 13  | `hr-management`   | **Ca làm & Lịch làm việc** | `attendance/shifts-schedules`           | `/hr-management/shifts`              | `hr_shifts`               | `ShiftTemplate`, `SchedulePattern`, `ScheduleAssignment`   |
| 14  | `hr-management`   | **Báo cáo chấm công**      | `attendance/attendance-reports`         | `/hr-management/attendance-reports`  | `hr_attendance_reports`   | `AttendancePeriod`, `AttendancePeriodLine`                 |
| 15  | `hr-management`   | **Đơn xin nghỉ phép**      | `leaves/leave-requests`                 | `/hr-management/leaves`              | `hr_leaves`               | `LeaveRequest`                                             |
| 16  | `hr-management`   | **Xét duyệt nghỉ phép**    | `leaves/leave-approvals`                | `/hr-management/leave-approvals`     | `hr_leave_approvals`      | `LeaveDecision`                                            |
| 17  | `work-management` | **Tổng quan làm việc**     | `coordination/workspace-today`          | `/` (Home)                           | `work_dashboard`          | `WorkspaceWidget`                                          |
| 18  | `work-management` | **Công việc & Nhiệm vụ**   | `work/tasks`                            | `/work-management/tasks`             | `work_tasks`              | `WorkTask`                                                 |
| 19  | `work-management` | **Bảng Kanban**            | `work/tasks` (Kanban view)              | `/work-management/kanban`            | `work_tasks`              | `WorkTask`                                                 |
| 20  | `work-management` | **Luồng quy trình việc**   | `work/tasks/workflow`                   | `/work-management/tasks`             | `work_task_workflow`      | `WorkTaskWorkflow`                                         |
| 21  | `work-management` | **Thảo luận công việc**    | `work/tasks/comments`                   | `/work-management/tasks`             | `work_task_comments`      | `WorkTaskComment`                                          |
| 22  | `work-management` | **Không gian dự án**       | `projects/project-spaces`               | `/work-management/projects`          | `work_projects`           | `WorkProject`                                              |
| 23  | `work-management` | **Mốc tiến độ & Cổng QA**  | `projects/milestones-qa`                | `/work-management/milestones`        | `work_milestones_qa`      | `WorkMilestone`, `WorkQaGate`                              |
| 24  | `work-management` | **Chấm công thời gian**    | `work/timesheets`                       | `/work-management/timesheets`        | `work_timesheets`         | `WorkTimesheet`                                            |
| 25  | `work-management` | **Lịch sự kiện**           | `coordination/workspace-today/calendar` | `/work-management/calendar`          | `work_calendar`           | `WorkEvent`                                                |
| 26  | `work-management` | **Đề xuất & Phê duyệt**    | `coordination/tickets-approvals`        | `/work-management/tickets-approvals` | `work_requests`           | `WorkRequest`                                              |
| 27  | `work-management` | **Trao đổi nội bộ**        | `coordination/internal-chat`            | `/work-management/internal-chat`     | `work_messages`           | `WorkThread`, `WorkMessage`                                |
| 28  | `work-management` | **Kho tri thức & SOP**     | `coordination/knowledge-sop`            | `/work-management/knowledge-sop`     | `work_notes`              | `WorkNote`                                                 |
| 29  | `work-management` | **Trung tâm thông báo**    | `coordination/notifications`            | `/work-management/notifications`     | `work_notifications`      | `NotificationRecord`                                       |

---

## 5. Quy tắc nghiệp vụ cốt lõi & Cơ chế an toàn

### 5.1. Khởi tạo Quản trị viên đầu tiên (First Admin Bootstrap)

- Hệ thống hỗ trợ chế độ tự khởi tạo an toàn. Khi khởi động trên cơ sở dữ liệu trống chưa có tài khoản (`needsSetup: true`), API tự động mở endpoint thiết lập tài khoản Quản trị viên đầu tiên tại giao diện `/tenant-system/auth`.
- Sau khi tài khoản Quản trị viên đầu tiên được tạo thành công, cờ `needsSetup` được khóa vĩnh viễn và hệ thống chuyển về chế độ bảo vệ xác thực nghiêm ngặt.

### 5.2. Quản lý phiên trượt & Kiểm soát truy cập (Sliding Window Session & RBAC)

- **Sliding Window:** Phiên đăng nhập có thời hạn mặc định 30 phút và tự động gia hạn khi có hoạt động mới của người dùng.
- **RBAC Guards:** Mọi route backend được bảo vệ bởi `SessionGuard` và `PermissionGuard`. Các quyền được khai báo thông qua Decorators: `@RequirePermission('module:action')`, `@AdminOnly()` hoặc `@Public()`.

### 5.3. Chính sách làm việc & Mạng nội bộ (Work Policies & Office IP Network)

- Cấu hình chuẩn 480 phút/ngày (8 giờ) và 2400 phút/tuần (40 giờ). Thiết lập giờ làm việc lõi (core hours), biên độ check-in linh hoạt.
- Whitelist địa chỉ IP văn phòng (`OfficeNetwork`) và cấu hình ngày nghỉ lễ chính thức (`WorkHoliday`).
- Thiết lập hạn mức nghỉ phép năm theo từng loại nghỉ (`LeaveQuota`).

### 5.4. Chấm công, Điểm danh & Bảng quân số hiện diện

- **Daily Check-in:** Ghi nhận giờ vào/ra thực tế, tự động tính toán thời lượng làm việc, phát hiện vi phạm đi muộn, về sớm hoặc quên checkout.
- **Check-in Explanations:** Nhân viên gửi giải trình kèm lý do cụ thể (sự cố giao thông, lỗi hệ thống, gặp khách hàng, sức khỏe). Quản lý duyệt giải trình để hợp lệ hóa bản ghi công.
- **Workforce Board:** Cung cấp ảnh chụp tức thời (presence snapshot) về quân số: tổng nhân sự, số lượng có mặt tại văn phòng, làm việc từ xa (remote), nghỉ phép, đi muộn.
- **Ca làm & Phân ca:** Thiết lập các mẫu ca làm (`ShiftTemplate`), mẫu tuần hoàn (`SchedulePattern`) và phân lịch làm việc cho từng nhân viên (`ScheduleAssignment`).
- **Kỳ chốt công (Attendance Reports):** Khóa sổ dữ liệu chấm công theo kỳ/tháng (`AttendancePeriod`). Khi chuyển sang trạng thái `CLOSED`, dữ liệu công trở thành bất biến để phục vụ tính lương.

### 5.5. Quản lý Nghỉ phép & Phân bổ Công suất

- **Leave Workflow:** Đơn nghỉ phép (`LeaveRequest`) được kiểm tra hạn mức còn lại và chỉ định người nhận bàn giao công việc trước khi gửi duyệt.
- **Quy tắc duyệt độc lập:** Quản lý không được tự duyệt đơn nghỉ phép của chính mình; quyết định duyệt/từ chối được lưu vết thành thực thể `LeaveDecision`.
- **Resource Capacity:** Quản lý quỹ giờ khả dụng của nhân sự trong tháng (`CapacityPeriod`), phân bổ thời lượng làm việc vào các dự án đang chạy (`ProjectAllocation`), từ đó tính toán tỷ lệ sử dụng công suất (utilization rate).

### 5.6. Trung tâm thông báo thời gian thực & Cơ chế Soft-Delete

- **Real-time SSE Stream:** Cung cấp kênh sự kiện một chiều Server-Sent Events tại `/api/v1/work/notifications/stream?recipient={name}`, thông báo đẩy tức thì khi có việc mới được gán, đổi trạng thái, duyệt đơn, tin nhắn hoặc lịch họp.
- **Xóa mềm (Soft Delete):** Thao tác xóa thông báo cập nhật trường `deletedAt: DateTime`. Thông báo lập tức biến mất khỏi giao diện và bộ đếm badge, nhưng dữ liệu database vẫn lưu trọn vẹn để bảo toàn kiểm toán.

### 5.7. Máy trạng thái công việc (Task State Machine: TR-02 → TR-09)

```text
[Draft] ──> [Open] ──> [In Progress] ──> [Review] ──> [Completed]
  │           │              │              │
  └───> [Cancelled]    [Blocked] <──────────┘
```

- Không thể chuyển sang `Completed` nếu các tiêu chí kiểm định (QA Gate) hoặc điều kiện tiên quyết chưa được nghiệm thu.

### 5.8. Nhật ký kiểm toán bất biến & Kiểm soát cập nhật đồng thời

- Mọi thao tác cấu hình, đổi quyền, duyệt đơn đều được ghi vào `tenant_checklog` dạng **Append-Only** (không có lệnh UPDATE/DELETE).
- Mọi model chứa trường `version: Int` để thực hiện **Optimistic Concurrency Control**, ngăn chặn triệt để xung đột ghi đè dữ liệu.

---

## 6. Hướng dẫn cài đặt & Khởi động nhanh

### 6.1. Yêu cầu môi trường

- **Node.js:** Phiên bản `>= 22.12.0` (Khuyến nghị Node.js v24.x LTS).
- **npm:** Phiên bản `>= 10.x`.
- **PostgreSQL:** Phiên bản `16+` đang hoạt động trên máy cục bộ (local).

### 6.2. Các bước cài đặt chi tiết

#### Bước 1: Cài đặt mã nguồn và thư viện

```sh
# Clone mã nguồn
git clone <repository-url>
cd OneOps

# Cài đặt toàn bộ dependencies trong monorepo
npm ci
```

#### Bước 2: Cấu hình biến môi trường

```sh
# Cấu hình Backend
cp apps/api/.env.example apps/api/.env

# Cấu hình Frontend
cp apps/web/.env.example apps/web/.env.local
```

Cập nhật chuỗi kết nối PostgreSQL trong `apps/api/.env`:

```env
PORT=4000
HOST=127.0.0.1
DATABASE_URL="postgresql://<db_user>:<db_password>@127.0.0.1:5432/<db_name>?schema=public"
```

#### Bước 3: Chuẩn bị cấu trúc thư mục, sinh Design Tokens và Prisma Client

```sh
npm run prepare:dev
```

#### Bước 4: Thực thi Migration cơ sở dữ liệu

```sh
npm run db:migrate
```

#### Bước 5: Khởi động môi trường phát triển (Dev Server)

```sh
npm run dev
```

Hệ thống sẽ đồng thời khởi động:

- **Web Frontend:** [http://localhost:3002](http://localhost:3002)
- **Backend API:** [http://127.0.0.1:4000/api/v1](http://127.0.0.1:4000/api/v1)

#### Bước 6: Khởi tạo tài khoản Quản trị viên đầu tiên

1. Truy cập trình duyệt vào: [http://localhost:3002/tenant-system/auth](http://localhost:3002/tenant-system/auth)
2. Nhập thông tin tài khoản quản trị (Họ tên, Email, Mật khẩu quản trị).
3. Sau khi tạo thành công, hệ thống sẽ tự động đăng nhập và đưa bạn vào Bảng điều khiển trung tâm (`/`).

---

## 7. Hướng dẫn sử dụng hệ thống (User Guide)

Hệ thống OneOps được tổ chức thành 26 module giao diện trên thanh Sidebar điều hướng:

### 7.1. Bắt đầu phiên làm việc & Điều hướng chung

- **Đăng nhập & Phiên làm việc:** Truy cập `/tenant-system/auth`. Hệ thống duy trì phiên trượt (30 phút). Thông tin người dùng hiện tại hiển thị tại góc trên bên phải thanh tiêu đề (AppShell Header).
- **Thanh điều hướng chính (Sidebar):** Cung cấp lối tắt tới 4 nhóm nghiệp vụ chính: _Điều phối công việc_, _Quản lý nhân sự_, _Quản trị hệ thống_ và _Giao diện Design System_.
- **Tạo nhanh toàn cục (Global Quick Create):** Nút dấu cộng `+` trên Header cho phép tạo ngay Công việc, Dự án, Sự kiện lịch, Đề xuất, Nhân viên, Ca làm, Đơn nghỉ phép hoặc Chính sách từ bất kỳ trang nào.

---

### 7.2. Phân hệ Quản lý Nhân sự (HR Management - 11 Modules)

#### A. Sơ đồ tổ chức & Phòng ban (`/hr-management/organization`)

- Thiết lập cây sơ đồ tổ chức phòng ban cha - con, bổ nhiệm Trưởng phòng phụ trách.

#### B. Chức danh & Ngạch bậc (`/hr-management/positions`)

- Khai báo danh mục vị trí công tác, ngạch bậc chuyên môn, phân loại cấp bậc.

#### C. Hồ sơ nhân sự (`/hr-management/employees`)

- Quản lý danh bạ nhân viên, thông tin liên lạc, mã nhân viên, phòng ban, chức vụ và liên kết tài khoản hệ thống.

#### D. Điểm danh hàng ngày (`/hr-management/attendance`)

- Thực hiện bấm giờ vào làm (Check-in) và tan ca (Check-out). Hệ thống tự động ghi nhận thời gian, địa chỉ IP và gắn cờ vi phạm (đi muộn, về sớm).

#### E. Bảng quân số hiện diện (`/hr-management/workforce`)

- Ban giám đốc và quản lý theo dõi tỷ lệ hiện diện tức thời: số nhân sự có mặt tại văn phòng, làm từ xa (remote), nghỉ phép, đi muộn theo từng phòng ban.

#### F. Giải trình điểm danh (`/hr-management/explanations`)

- Nhân viên gửi đơn giải trình lý do vi phạm điểm danh. Quản lý trực tiếp xem xét duyệt hoặc từ chối để cập nhật lại trạng thái công.

#### G. Ca làm & Lịch làm việc (`/hr-management/shifts`)

- Tạo mẫu ca làm việc (giờ bắt đầu, kết thúc, nghỉ giữa ca), lập lịch tuần hoàn và phân ca cho nhân sự.

#### H. Báo cáo chấm công & Kỳ chốt công (`/hr-management/attendance-reports`)

- Tổng hợp bảng công toàn công ty theo tháng/kỳ. Thực hiện chốt công (Close Period) để phục vụ thanh toán lương an toàn.

#### I. Đơn xin nghỉ phép (`/hr-management/leaves`)

- Nhân viên tạo đơn xin nghỉ phép (nghỉ năm, ốm, thai sản, không lương), kiểm tra số ngày phép còn lại và chỉ định người nhận bàn giao công việc.

#### J. Xét duyệt nghỉ phép (`/hr-management/leave-approvals`)

- Cấp quản lý xem danh sách đơn nghỉ phép cần phê duyệt, thực hiện Duyệt hoặc Từ chối kèm lý do phản hồi.

#### K. Công suất & Định biên nhân sự (`/hr-management/capacity`)

- Quản lý tổng quỹ giờ làm việc của nhân sự trong tháng, phân bổ giờ công vào từng dự án cụ thể và giám sát tỷ lệ quá tải / thiếu tải (utilization rate).

---

### 7.3. Phân hệ Điều phối Công việc (Work Management)

#### A. Tổng quan ngày làm việc (`/` - Workspace Today)

- Widget thống kê tức thời việc cần làm, việc đang xử lý, việc trễ hạn và các sự kiện trong ngày.

#### B. Quản lý Công việc & Bảng Kanban (`/work-management/tasks` & `/work-management/kanban`)

- Tạo công việc, gán người phụ trách, độ ưu tiên, hạn chót, checklist con.
- Kéo thả thẻ công việc trên bảng Kanban qua các cột trạng thái theo chuẩn máy trạng thái (TR-02..TR-09).
- Bấm vào chi tiết công việc để trao đổi qua luồng bình luận (Task Comments).

#### C. Quản lý Dự án & Cổng QA (`/work-management/projects` & `/work-management/milestones`)

- Quản lý không gian dự án, theo dõi % hoàn thành. Thiết lập các Mốc bàn giao (Milestone) và Cổng kiểm định chất lượng (QA Gate) trước khi đóng mốc.

#### D. Chấm công thời gian thực (`/work-management/timesheets`)

- Ghi nhận giờ làm việc hàng ngày theo bước 15 phút cho từng công việc hoặc dự án, nộp bảng công tuần cho quản lý duyệt.

#### E. Lịch sự kiện (`/work-management/calendar`)

- Lịch làm việc dạng Tháng, Tuần, Ngày; tự động gửi thông báo lịch tới người tham gia.

#### F. Đề xuất & Phê duyệt (`/work-management/tickets-approvals`)

- Tạo phiếu đề xuất nội bộ (tạm ứng, mua sắm, đề xuất chung); luồng duyệt/từ chối từ cấp quản lý.

#### G. Trao đổi nội bộ & Kho tri thức SOP (`/work-management/internal-chat` & `/work-management/knowledge-sop`)

- Nhắn tin trao đổi theo luồng chủ đề công việc; soạn thảo và lưu trữ quy trình vận hành tiêu chuẩn (SOP).

#### H. Trung tâm thông báo thời gian thực (`/work-management/notifications`)

- Chuông thông báo hiển thị huy hiệu (badge) thời gian thực qua Server-Sent Events. Thao tác xóa thông báo áp dụng cơ chế Xóa mềm (Soft Delete) bảo toàn kiểm toán.

---

### 7.4. Phân hệ Quản trị Hệ thống (Tenant System)

#### A. Chính sách vận hành doanh nghiệp (`/tenant-system/work-policies`)

- Thiết lập quy chuẩn giờ làm việc ngày/tuần, giờ làm việc lõi, danh sách IP văn phòng cho phép, lịch nghỉ lễ và định mức ngày nghỉ phép năm.

#### B. Quản lý tài khoản (`/tenant-system/accounts`)

- Cấp tài khoản mới cho nhân sự, phân bổ trạng thái (_Kích hoạt / Tạm khóa_).

#### C. Vai trò & Quyền hạn (`/tenant-system/roles-permissions`)

- Thiết lập các vai trò người dùng và phân quyền chi tiết (Xem, Tạo, Sửa, Duyệt, Xóa) trên từng phân hệ nghiệp vụ cụ thể.

#### D. Nhật ký kiểm toán (`/tenant-system/checklog`)

- Tra cứu toàn bộ lịch sử thao tác quan trọng trên hệ thống (ai thực hiện, hành động gì, thời gian nào, dữ liệu trước và sau thay đổi) dạng Append-only bất biến.

---

## 8. Hệ thống Design Tokens & Tùy biến Theme

OneOps sở hữu hệ thống thiết kế đồng nhất dựa trên **187 semantic design tokens**, được định nghĩa duy nhất tại `tokens/source.json`.

- **Thư viện mẫu UI:** Xem trực tiếp tại [http://localhost:3002/design-system](http://localhost:3002/design-system)
- **Bảng tra cứu Token:** Xem trực tiếp tại [http://localhost:3002/design-tokens](http://localhost:3002/design-tokens)

```text
tokens/
├── source.json              # NGUỒN DUY NHẤT: Bảng token gốc
├── README.md                # Tài liệu phân loại token
└── generated/               # Các file sinh tự động (KHÔNG sửa trực tiếp)
    ├── tokens.css           # Biến CSS nạp tại root layout
    ├── tokens.d.ts          # Định nghĩa kiểu TypeScript
    └── tokens.json          # Mapping JSON cho công cụ build
```

### Hướng dẫn tùy biến giao diện theo thương hiệu (Theme Customization)

1. Mở file `tokens/source.json`.
2. Thay đổi giá trị màu sắc, bo góc, font chữ tại các token ngữ nghĩa (`color.accent.primary`, `color.surface.canvas`, `color.text.primary`...).
3. Chạy lệnh biên dịch token:
   ```sh
   npm run tokens:build
   ```
4. Xác nhận tính hợp lệ bằng cổng kiểm tra token:
   ```sh
   npm run tokens:check
   npm run test:tokens
   ```

---

## 9. Bộ lệnh phát triển & Cổng kiểm tra chất lượng

### 9.1. Các lệnh phát triển hàng ngày

| Lệnh                             | Chức năng                                                  |
| :------------------------------- | :--------------------------------------------------------- |
| `npm run dev`                    | Khởi chạy toàn bộ hệ thống (Web + API) ở chế độ phát triển |
| `npm run dev:web`                | Khởi chạy riêng ứng dụng Next.js frontend (Port 3002)      |
| `npm run dev:api`                | Khởi chạy riêng dịch vụ NestJS backend (Port 4000)         |
| `npm run prepare:dev`            | Chuẩn bị thư mục feature, build tokens và generate Prisma  |
| `npm run db:generate`            | Biên dịch lại Prisma client và build gói database          |
| `npm run db:migrate`             | Áp dụng các migration Prisma có sẵn lên database dev       |
| `npm run db:dev -- --name <ten>` | Tạo và kiểm tra migration mới trong quá trình phát triển   |
| `npm run format`                 | Tự động định dạng code bằng Prettier cho toàn bộ repo      |

### 9.2. Cổng kiểm tra chất lượng trước khi bàn giao (Pre-flight Quality Gates)

Trước khi commit mã nguồn hoặc tạo Pull Request, bắt buộc phải vượt qua toàn bộ các cổng kiểm định sau:

```sh
# 1. Kiểm tra ranh giới kiến trúc & cấu trúc 4 phân hệ (29 data implementations)
npm run architecture:check

# 2. Quét mã nguồn mồ côi (toàn bộ 698 source files reachable)
npm run unused:check

# 3. Thẩm định tính nguyên vẹn của 187 Design Tokens
npm run tokens:check

# 4. Kiểm tra kiểu dữ liệu toàn bộ monorepo (0 errors)
npm run typecheck

# 5. Kiểm tra quy chuẩn mã nguồn bằng ESLint (0 errors)
npm run lint

# 6. Kiểm tra chuẩn định dạng Prettier
npm run format:check

# 7. Kiểm thử tích hợp toàn bộ API nghiệp vụ (26/26 test suites)
npm run test:api

# 8. Biên dịch production build cho cả Web và API
npm run build
```

---

## 10. Quy tắc phát triển & Hướng dẫn phối hợp AI

> Chi tiết quy định xem tại: [AGENTS.md](AGENTS.md).

Khi làm việc độc lập hoặc hướng dẫn các trợ lý AI hỗ trợ phát triển:

1. **Phạm vi hẹp & tập trung:** Chỉ sửa đổi mã nguồn bên trong đường dẫn chức năng được giao (`<feature-path>`). Tuyệt đối không format hoặc sửa đổi mã nguồn ngoài phạm vi.
2. **Component tự sở hữu:** Thành phần UI phải nằm trong thư mục `components/primitives/` của chính chức năng đó. Có thể tham khảo code mẫu từ `/design-system`, sao chép vào nội bộ feature và đổi đường dẫn import; không phụ thuộc vào component chung.
3. **Tuân thủ Design Tokens:** Luôn sử dụng Tailwind utilities ngữ nghĩa (`bg-surface`, `text-foreground`, `border-border`, `rounded-control`). Không hardcode mã màu hex/RGB, không lạm dụng `!important` hay override CSS toàn cục.
4. **Không hard-delete dữ liệu:** Mọi dữ liệu liên quan đến lịch sử kiểm toán, thông báo hoặc nghiệp vụ người dùng phải áp dụng cơ chế đánh dấu xóa mềm (`deletedAt`) hoặc append-only log.
5. **Đảm bảo tính trung thực:** Không nuốt lỗi (silent fail), không trả dữ liệu mẫu/mock data giả mạo trên môi trường production, và giữ nguyên tính xác thực phân quyền của hệ thống.

---

## Bản quyền & Đóng góp

Hệ thống được phát triển bởi đội ngũ kỹ thuật **OneOps**. Mọi quyền được bảo lưu. Để biết thêm thông tin chi tiết về tài liệu kỹ thuật, vui lòng tham khảo thư mục [docs/](docs/ARCHITECTURE.md) và sơ đồ tương tác tại [graphify-out/OneOps-callflow.html](graphify-out/OneOps-callflow.html).
