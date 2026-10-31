# Hợp đồng triển khai OneOps — v1

Tài liệu này chốt các contract nền tảng cho mọi package sau Phase 0. Contract chỉ được thay đổi có chủ đích, kèm cập nhật tài liệu, checker và test; không thay đổi cục bộ trong một feature.

## 1. Thứ tự ưu tiên nguồn

1. Chỉ dẫn hiện hành của người dùng và `AGENTS.md`.
2. `c_t_h_th_ng_ai_agent_skill.md`.
3. `docx_dacthap.txt`, `docx_bocung.txt`, `xlsx_strings.txt`.
4. Specification đã được duyệt trong `docs/specifications/`.
5. Tài liệu kỹ thuật trong `docs/`.

Khi nguồn mâu thuẫn, không tự chọn theo thói quen triển khai. Ghi quyết định vào specification/ADR tương ứng và giữ code cũ cho đến khi có phê duyệt nếu thay đổi đó ảnh hưởng dữ liệu hoặc quyền.

## 2. Ranh giới sở hữu

| Dữ liệu/quyết định                                             | Nơi sở hữu duy nhất                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Account lifecycle, password reset, lock/unlock                 | `tenant-system/access-control/accounts`                                    |
| Session, login/logout, actor context                           | `tenant-system/access-control/tenant-auth`                                 |
| Role nền tảng, `is_system_admin`, permission/ABAC policy       | `tenant-system/access-control/roles-permissions`                           |
| Employee profile, job title, grade                             | `hr-management/employees/*`, `hr-management/organization/positions-grades` |
| Department, Team, membership, organization history             | `hr-management/organization/departments-teams`                             |
| Work policy, holiday, office IP, leave quota                   | `tenant-system/organization/work-policies`                                 |
| Audit/checklog                                                 | `tenant-system/checklog`                                                   |
| Task aggregate, assignee/reviewer/deadline/status history      | `work-management/work/tasks`                                               |
| Transition/proposal decision                                   | `work-management/work/task-workflow`                                       |
| Task comment persistence                                       | `work-management/work/task-comments`                                       |
| Kanban projection/interaction                                  | `work-management/work/kanban`                                              |
| Project, Backlog, Sprint, Story Points, Scrum metrics          | `work-management/projects/project-spaces`                                  |
| Attendance, leave, explanations, shifts/schedules              | `hr-management/*` theo nhánh tương ứng                                     |
| In-app notification, delivery state, outbox                    | `work-management/coordination/notifications`                               |
| Email/Zalo provider configuration/adapters                     | `tenant-system/automation-hub/external-integrations`                       |
| Customer, quotation, contract, receivable, portal, after-sales | `crm/*` theo nhánh tương ứng                                               |

Quy tắc bắt buộc:

- Leaf backend feature chỉ dùng repository/delegate do mình sở hữu.
- Leaf frontend feature chỉ import public `index.ts` của chính feature; hai ngoại lệ Tasks → Kanban/TaskComments giữ nguyên.
- Tích hợp đồng bộ nằm ở main-module composition hoặc composition module được đặt tên rõ, dùng public service/module.
- Account/Employee, Task/Team/Project, CRM/Project liên kết bằng scalar ID. Không thêm foreign key xuyên namespace nếu chưa có quyết định tích hợp riêng.
- Không trả entity Prisma thô qua API; DTO phải loại bỏ password/session/secret và kiểm soát field nhạy cảm.

## 3. Actor và authorization

Actor context tối thiểu:

```ts
interface ActorContext {
  accountId: string;
  employeeId: string;
  role: "EMPLOYEE" | "MANAGER";
  isSystemAdmin: boolean;
  sessionId: string;
}
```

- Authentication xác thực session; authorization không được suy ra chỉ từ actor context.
- Mỗi service operation kiểm tra permission và quan hệ dữ liệu: Department/Team/Project scope, assignee, reviewer, trạng thái entity, quyền quản trị nhóm chat.
- `isSystemAdmin` không thay thế kiểm tra trạng thái; thao tác ngoài phạm vi phải ghi audit với `isOutOfScopeOverride = true`.
- Không tự duyệt đơn/đề xuất của chính mình. Không bớt manager/admin cuối cùng.
- UI ẩn/hiện chỉ là hỗ trợ; API vẫn phải từ chối truy cập trực tiếp trái phép.
- Job title không xuất hiện trong bất kỳ điều kiện cấp quyền nào.

## 4. HTTP contract

- Global prefix: `/api/v1`.
- Success list: `{ items, total, page, pageSize }` theo implementation hiện có.
- Success detail/mutation: DTO của entity; mutation trả trạng thái sau khi ghi thành công.
- Error mục tiêu: `{ code, message, fieldErrors?, requestId?, details? }`.
- `code` là mã ổn định dùng cho client/test; `message` dành cho người dùng và có thể bản địa hóa.
- `401` chưa xác thực; `403` thiếu quyền/vi phạm scope; `404` không tồn tại hoặc bị che theo privacy; `409` trùng dữ liệu, version conflict, transition không hợp lệ hoặc idempotency conflict; `422` dữ liệu hợp lệ về cú pháp nhưng vi phạm nghiệp vụ.
- Mọi input dùng Zod `.strict()` ở boundary. Không dùng `any` hoặc ép kiểu để bỏ validation.

### Version và idempotency

- Update quan trọng giữ `version` lạc quan và trả `409` nếu version cũ.
- Create/transition/check-in/request/Sprint action nhận `Idempotency-Key` từ 8–128 ký tự; client tạo lại key cho cùng một ý định.
- Scope idempotency gồm actor + operation + key; lưu request hash và kết quả/trạng thái xử lý trong PostgreSQL.
- Gửi lại cùng key và cùng payload trả kết quả ban đầu, không tạo bản ghi/transition thứ hai.
- Cùng key nhưng payload khác trả `409`; không ghi đè âm thầm.

## 5. Event và outbox contract

Envelope tối thiểu:

```ts
interface DomainEvent<TPayload> {
  eventId: string;
  type: string;
  version: 1;
  occurredAt: string;
  actorId: string | null;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string;
  causationId: string | null;
  payload: TPayload;
}
```

- Tên event dùng dạng `<domain>.<aggregate>.<past-tense-action>`, ví dụ `work.task.assigned`, `hr.leave.approved`, `identity.account.locked`.
- Event được ghi cùng transaction với thay đổi nghiệp vụ. Không phát side effect bên ngoài trước khi transaction commit.
- Worker claim job bằng PostgreSQL với lease; retry có backoff, giới hạn và dead-letter state. Claim phải an toàn khi có nhiều worker.
- `eventId` là khóa chống xử lý trùng; consumer phải idempotent.
- Lỗi Email/Zalo không rollback transaction và không làm mất In-app notification.
- Trước khi gửi deadline/Sprint alert, worker đọc lại trạng thái hiện tại.
- Nhiều cảnh báo quá hạn của cùng người nhận được gom theo digest policy.
- SSE dùng `Last-Event-ID`, replay từ notification/event đã lưu, heartbeat và trạng thái reconnect rõ ràng.

Catalog event khởi tạo:

| Event                                                                          | Producer          | Consumer chính                              |
| ------------------------------------------------------------------------------ | ----------------- | ------------------------------------------- |
| `identity.account.locked` / `.unlocked`                                        | Accounts          | Task reassignment flag, notification        |
| `organization.team.member-removed` / `.changed`                                | Departments/Teams | Task reassignment flag, notification        |
| `hr.leave.approved` / `.rejected` / `.cancelled`                               | Leave             | Attendance update, Task reassignment flag   |
| `work.task.assigned` / `.reassigned` / `.status-changed` / `.proposal-decided` | Tasks/Workflow    | Notification, Kanban/dashboard invalidation |
| `work.comment.created`                                                         | Task Comments     | Notification/mentions                       |
| `work.project.sprint-activated` / `.sprint-closed` / `.project-held`           | Projects          | Task pause/resume, notification, metrics    |
| `notification.delivery-requested`                                              | Notifications     | Email/Zalo adapters                         |

Bổ sung event mới phải cập nhật bảng này và test contract trước khi dùng.

### 5.1. Bus tự động hóa (`core/events/workflow-events.ts`)

Vì feature lá không được import feature khác và composition không vượt qua module chính, tự động hóa nối qua bus hạ tầng thay vì gọi chéo:

- Chủ sở hữu dữ liệu công bố `WorkflowSnapshot` (`entity`, `id`, `code`, `name`, `status`, `assignee`, `reviewer`, `scope`, `date`, `previous`) sau mỗi lần tạo hoặc cập nhật; `previous` chỉ chứa trường thực sự đổi.
- `tenant-system/automation-hub/workflow-rules` sở hữu quy tắc: đánh giá các quy tắc đang bật theo `position`, ghép điều kiện bằng AND, rồi công bố `WorkflowAction` (`assign`, `status`, `comment`, `notify`).
- Feature sở hữu bản ghi đăng ký bộ áp dụng (`work-management/automation.actions.ts`) và chỉ ghi qua public service của chính nó.
- Hành động `status` vẫn phải đi qua một cạnh hợp lệ của `TRANSITIONS` và cổng deadline; cạnh không hợp lệ bị từ chối, không có đường tắt cho tự động hóa.
- Khóa theo `entityId` trong `lockSeconds` chặn vòng lặp do chính tự động hóa gây ra.
- `AutomationRun` lưu từng lượt (`APPLIED` / `SKIPPED` / `FAILED`) và không bị xóa theo quy tắc: xóa quy tắc không xóa lịch sử đã tác động lên bản ghi.
- `POST /automation/simulate` chạy thử trên snapshot giả lập và không ghi lượt chạy.

## 6. Migration contract

- Mọi thay đổi model theo bốn bước: expand → backfill → verify → contract.
- Expand chỉ thêm bảng/cột/index tương thích; không đổi nghĩa cột đang dùng.
- Backfill chạy theo batch, có checkpoint, idempotent và không giữ transaction quá dài.
- Verify đối chiếu tổng số, orphan, null không mong đợi và mẫu dữ liệu trước khi bỏ fallback.
- Contract chỉ bỏ cột/field cũ sau khi API, UI, test và báo cáo đều chuyển xong; migration đã áp dụng không được sửa.
- Không chấp nhận `DROP` ngoài phạm vi, đặc biệt `work_teams`; đọc toàn bộ SQL trước khi áp dụng.
- Không reset database, không tự xóa dữ liệu để che drift.
- Backfill Task assignee/reviewer chỉ khi khớp duy nhất với Account/Employee; nếu không, giữ legacy display value và đưa vào danh sách cần sửa.
- Deadline legacy dạng ngày được hiểu là cuối ngày làm việc cấu hình tại `Asia/Ho_Chi_Minh`; giá trị gốc được giữ đến khi verify.
- Database test phải có tên kết thúc `_test` trước khi chạy test xóa/khôi phục.

## 7. Thứ tự phụ thuộc

1. Employee, Department/Team, Work Policy, Audit.
2. Account, session, permission matrix.
3. Task aggregate và state machine.
4. Task comments, Kanban projection, notification outbox/SSE.
5. Attendance, leave, scheduler, báo cáo HR.
6. Project/Sprint/Backlog, Scrum metrics, Calendar integration.
7. Chat, file/provider adapters, requests/SOP.
8. CRM và liên kết CRM → Project.
9. Workspace composition, workflow automation, AI Copilot.
10. Hardening và release gate.

Không đảo thứ tự để làm UI trước khi contract dữ liệu/quyền của package đó được duyệt. UI có thể dùng dữ liệu read-only đã có để nghiên cứu, nhưng không tạo endpoint/dữ liệu giả để hoàn thiện màn hình.

## 8. Điều kiện hoàn thành package

Một package chỉ hoàn thành khi:

- Business specification và acceptance mapping đã được duyệt (nếu thuộc danh sách gated).
- FE, BE, Prisma, authorization, event/outbox và integration được nối thật.
- Test unit/service, API integration và Playwright journey tương ứng đạt.
- Migration SQL được review; dữ liệu cũ được kiểm tra.
- UI đạt contract tại `docs/UX-DESIGN-CONTRACT.md`, có screenshot bốn profile.
- `architecture:check`, `unused:check`, `tokens:check`, `typecheck`, `lint`, `format:check`, `build` đạt hoặc có blocker được báo trung thực.
- Handoff ghi changed paths, integration files, migration/env, command/result, phần chưa làm.

## 9. Nhật ký bàn giao

### `hr-management/organization/departments-teams` — 30/10/2026

- Phạm vi: phòng ban và nhóm làm việc, trạng thái ACTIVE/INACTIVE, không xóa cứng; BR-ORG-10 chặn ngừng phòng ban khi còn nhóm hoạt động.
- Dữ liệu: schema `hr_departments`, model `Department`/`Team`, migration `20261030140000_hr_departments`.
- API: `GET/POST /api/v1/org/departments`, `PATCH /api/v1/org/departments/:id`, `GET/POST /api/v1/org/teams`, `PATCH /api/v1/org/teams/:id`; version lạc quan trả `409`.
- DTO phòng ban trả `teamCount` (tổng) và `activeTeamCount` (đang hoạt động); điều kiện chặn và thông báo trên UI dùng `activeTeamCount`.
- Integration: `feature-registry.ts`, `feature-forms.ts`, `hr-management.module.ts`, `modules.json` (`kind: "resource"`), `base.prisma`, `apps/api/test/database.mjs`.

### `hr-management/organization/positions-grades` — 30/10/2026

- Phạm vi: chức danh và cấp bậc; cấp bậc gắn chức danh tùy chọn, ngắt liên kết bằng `null`; không xóa cứng; chức danh không tham gia bất kỳ điều kiện cấp quyền nào.
- Dữ liệu: schema `hr_positions`, model `Position`/`Grade`, migration `20261030150000_hr_positions`.
- API: `GET/POST /api/v1/org/positions`, `PATCH /api/v1/org/positions/:id`, `GET/POST /api/v1/org/grades`, `PATCH /api/v1/org/grades/:id`; `rank` là số nguyên 1–99.
- Route web: `/hr-management/positions` với scope chức danh/cấp bậc và bộ lọc trạng thái.

### `hr-management/employees/employee-directory` — 31/10/2026

- Phạm vi: hồ sơ nhân sự dùng cho phân công, điểm danh, báo cáo; không xóa cứng, nghỉ việc là `INACTIVE`. Chức danh chỉ là thuộc tính, không cấp quyền (khớp đặc tả hệ thống).
- Quan hệ tổ chức: `departmentName`, `teamName`, `managerName`, `jobTitle` là nhãn văn bản tự do giống `WorkTask.assignee`; tư cách thành viên nhóm vẫn thuộc `departments-teams`, không tạo khóa ngoại chéo namespace.
- Dữ liệu: schema `hr_employees`, model `Employee` (`codeKey` unique, `emailKey` unique và `null` khi rỗng), migration `20261031090000_hr_employees`.
- API: `GET/POST /api/v1/employees`, `GET/PATCH /api/v1/employees/:id`; lọc `q`/`status`/`departmentName`/`jobTitle`, version lạc quan trả `409`, trùng mã/email trả `409`, không có `DELETE`.
- Route web: `/hr-management/employees` — thẻ thống kê, tìm kiếm, lọc phòng ban/trạng thái, bảng ở desktop và danh sách thẻ ở mobile.
- Integration: `feature-registry.ts`, `feature-forms.ts`, `hr-management.module.ts`, `hr-management/index.ts`, `modules.json` (`kind: "resource"`), `base.prisma`.

### Kết quả gate Phase 1 (30/10/2026)

| Lệnh                                 | Kết quả                                                              |
| ------------------------------------ | -------------------------------------------------------------------- |
| `npm run architecture:check`         | Đạt — 11 implementation (9 record, 2 resource), 13 model             |
| `npm run test:architecture`          | Đạt 13/13                                                            |
| `npm run unused:check`               | Đạt — 336 file reachable                                             |
| `npm run tokens:check`               | Đạt — 187 token                                                      |
| `npm run typecheck` / `npm run lint` | Đạt                                                                  |
| `npm run build`                      | Đạt — có `/hr-management/organization` và `/hr-management/positions` |
| `npm run test:api`                   | Đạt 12/12                                                            |
| `npm run test:e2e`                   | Đạt 8/8 (gồm `tests/organization.spec.ts`)                           |
| `npm run format:check`               | Không đạt do nợ định dạng có sẵn; mọi file của Phase 1 đã format     |

Ghi chú vận hành: `prisma migrate dev` đang từ chối vì migration `20261030120000_notification_soft_delete` bị sửa sau khi áp dụng (drift có sẵn). Migration mới được tạo bằng `prisma migrate diff --from-config-datasource --to-schema prisma/schema --script`, review SQL rồi `prisma migrate deploy`; không reset database.

### Kết quả gate bổ sung (31/10/2026)

| Lệnh                                 | Kết quả                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `npm run architecture:check`         | Đạt — 12 implementation (9 record, 3 resource), 14 model                      |
| `npm run test:architecture`          | Đạt 13/13                                                                     |
| `npm run unused:check`               | Đạt — 359 file reachable                                                      |
| `npm run tokens:check`               | Đạt — 187 token                                                               |
| `npm run typecheck` / `npm run lint` | Đạt                                                                           |
| `npm run build`                      | Đạt — thêm `/hr-management/employees`                                         |
| `npm run test:api`                   | Đạt 13/13 (thêm journey CRUD nhân sự, gồm trùng mã/email và version lạc quan) |
| `npm run test:e2e`                   | Đạt 9/9 (thêm `tests/employees.spec.ts`)                                      |
| `npm run format:check`               | Không đạt do CRLF trong working tree; mọi file đã sửa đều đạt `prettier -c`   |

Hai lỗi sản phẩm được phát hiện và sửa trong đợt này:

- Zod 4 giữ `.default()` khi gọi `.partial()`, nên PATCH bỏ trống field sẽ ghi đè về mặc định (mất dữ liệu). Đã tách "field shape" không default khỏi schema create ở cả BE (`departments-teams`, `positions-grades`, `employee-directory`) và FE (`*Patch`), kèm assertion hồi quy trong `tests/api.integration.test.mjs`.
- Client danh sách nhóm nối `?page=` vào path đã có query nên trả `400 Dữ liệu không hợp lệ`; đã sửa separator. Thêm `relative` cho khung cuộn bảng để caption `sr-only` không đẩy `scrollWidth` toàn trang trên mobile.

### `tenant-system/access-control/accounts` — 31/10/2026

- Phạm vi: tài khoản đăng nhập và cấp quyền. Chỉ hai vai trò `EMPLOYEE`/`MANAGER`; quản trị cấp cao là `MANAGER` kèm `isSystemAdmin`; chức danh không cấp quyền. Không xóa cứng: nghỉ việc là `status = LOCKED` kèm `lockedReason`.
- Bất biến được cưỡng chế trong transaction `RepeatableRead`: không thể bớt vai trò Quản lý, bỏ quyền quản trị hay khóa tài khoản khi đó là Quản lý/quản trị viên đang hoạt động cuối cùng — trả `422` với thông báo nghiệp vụ.
- Lịch sử quyền: mỗi thay đổi `ROLE`/`ADMIN`/`STATUS`/`PASSWORD` sinh một dòng `AccountAccessChange` (from → to, người thực hiện, lý do); dòng `ROLE`/`ADMIN` đầu tiên được ghi ngay khi tạo tài khoản với lý do "Tạo tài khoản".
- Mật khẩu: `scrypt` của `node:crypto` (định dạng `scrypt$salt$key`), không trả về trong bất kỳ DTO nào; `mustChangePassword` bật lại sau mỗi lần đặt lại.
- Dữ liệu: schema `tenant_accounts`, model `Account`/`AccountAccessChange`, migration `20261031100000_tenant_accounts` (đã review SQL, `migrate diff --exit-code` sạch).
- API: `GET/POST /api/v1/accounts`, `GET/PATCH /api/v1/accounts/:id`, `POST /api/v1/accounts/:id/access` (`@HttpCode(200)`), `POST /api/v1/accounts/:id/password` (`@HttpCode(200)`), `GET /api/v1/accounts/:id/history`; lọc `q`/`role`/`status`, version lạc quan trả `409`, trùng username/email trả `409`, không có `DELETE`.
- Route web: `/tenant-system/accounts` — thẻ thống kê, tìm kiếm, lọc vai trò/trạng thái, bảng desktop + danh sách thẻ mobile, dialog tạo/sửa, phân quyền, đặt lại mật khẩu và lịch sử quyền.
- Integration: `feature-registry.ts`, `feature-forms.ts`, `tenant-system.module.ts`, `tenant-system/index.ts`, `modules.json` (`kind: "resource"`), `base.prisma`.

### Kết quả gate tenant-system/accounts (31/10/2026)

| Lệnh                                 | Kết quả                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `npm run architecture:check`         | Đạt — 13 implementation (9 record, 4 resource), 16 model               |
| `npm run test:architecture`          | Đạt 13/13                                                              |
| `npm run unused:check`               | Đạt — 386 file reachable                                               |
| `npm run tokens:check`               | Đạt — 187 token                                                        |
| `npm run typecheck` / `npm run lint` | Đạt                                                                    |
| `npm run build`                      | Đạt — thêm `/tenant-system/accounts`                                   |
| `npm run test:api`                   | Đạt 14/14 (thêm journey tài khoản: quyền cuối cùng, lịch sử, mật khẩu) |
| `npm run test:e2e`                   | Đạt 10/10 (thêm `tests/accounts.spec.ts`)                              |
| `npm run format:check`               | Không đạt do nợ CRLF có sẵn; mọi file đã sửa đạt `prettier -c`         |

Hai lỗi sản phẩm được phát hiện và sửa trong đợt này:

- `Field` bọc cả gợi ý/lỗi trong `<label>`, nên accessible name của control là "nhãn + gợi ý + toàn bộ option" — screen reader đọc sai và định vị test không ổn định. Đã chuyển `<label htmlFor>` ngang hàng, tự sinh `id` và nối `aria-describedby` cho gợi ý/lỗi.
- Endpoint thay đổi quyền/đặt lại mật khẩu trả `201` mặc định của Nest dù không tạo resource; đã thêm `@HttpCode(200)`.

Giới hạn đã biết: form quyền/mật khẩu vẫn gửi `actorName` mặc định `Quản trị viên` (`actorPlaceholder`); API bỏ qua giá trị này và ghi lịch sử bằng `displayName` của phiên đăng nhập (`create`, `changeAccess`, `resetPassword` nhận `@CurrentActor()`).

### `tenant-system/access-control/tenant-auth` (BE) — 31/10/2026

- Phạm vi: phiên đăng nhập thật cho tài khoản đã có. Đăng nhập bằng `usernameKey` + `scrypt`, sai mật khẩu trả `401`, tài khoản `LOCKED` trả `403` kèm lý do khóa.
- Phiên: token 32 byte ngẫu nhiên chỉ gửi về client qua cookie `oneops_session` (HttpOnly, SameSite=Lax, `Secure` khi `COOKIE_SECURE=1`); DB chỉ lưu `sha256`. Hết hạn sau **30 phút không hoạt động** (sliding window, ghi heartbeat tối đa mỗi 60 giây); phiên hết hạn bị `revoke` và trả `401`.
- Dữ liệu: schema `tenant_auth`, model `AuthSession`, migration `20261031120000_tenant_auth` (SQL chỉ tạo schema/bảng/chỉ mục, `migrate diff --exit-code` sạch).
- API: `POST /api/v1/auth/login` (`200`, `Set-Cookie`), `POST /api/v1/auth/logout` (`200`, xóa cookie), `GET /api/v1/auth/session` (trả `actor`, `idleMinutes`, `expiresAt`), `POST /api/v1/auth/password` (đổi mật khẩu của chính mình, `422` khi sai mật khẩu hiện tại, thu hồi các phiên khác).
- Ranh giới: `tenant-auth` không import feature khác. Nó khai báo port `CredentialsPort`; `AccountsService` công bố `verify`, `credential`, `changeOwnPassword`, `markSignedIn`; `accounts-credentials.ts` (composition của `tenant-system`) nối hai bên. `TenantAuthModule.forRoot({ credentials, imports })` nhận provider từ composition.
- Hạ tầng dùng chung: `apps/api/src/core/auth/actor-context.ts` định nghĩa `ActorContext`, `ActorRequest`, decorator `@Public()` và `@CurrentActor()`; `SessionGuard` gắn actor vào request khi có cookie hợp lệ (kể cả route `@Public`).
- Proxy web `apps/web/src/app/api/[...path]/route.ts` nay chuyển tiếp `Cookie` lên API và trả lại mọi `Set-Cookie`, nên trình duyệt giữ được phiên.
- Đăng ký: `modules.json` entry `tenant-auth` (`kind: "resource"`; giai đoạn này còn `frontend: false`, giao diện bổ sung ở hạng mục dưới), `base.prisma` thêm namespace `tenant_auth`, `tenant-system.module.ts`, `tenant-system/index.ts`.
- **Đã bật cưỡng chế toàn cục ở hạng mục sau** (`tenant-system/auth` — 31/10/2026, xem dưới).

### `tenant-system/access-control/tenant-auth` (giao diện + cưỡng chế phiên) — 31/10/2026

- Cưỡng chế: `TenantSystemModule` đăng ký `{ provide: APP_GUARD, useExisting: SessionGuard }`. Mọi route cần phiên hợp lệ trừ route có `@Public()`: `GET /auth/setup`, `POST /auth/login`, `POST /auth/logout`, `POST /accounts` (bootstrap). `@AdminOnly()` bảo vệ `PATCH /accounts/:id`, `POST /accounts/:id/access`, `POST /accounts/:id/password`; thiếu quyền trả `403`.
- Bootstrap: `POST /accounts` chỉ mở khi tenant chưa có tài khoản; tài khoản đầu tiên bắt buộc `MANAGER` + `isSystemAdmin` (`422` nếu khác), sau đó mọi lời gọi ẩn danh bị `403`. `GET /auth/setup` trả `{ needsSetup, idleMinutes }` để màn hình đăng nhập biết chế độ tạo quản trị đầu tiên.
- Ghi lịch sử quyền: `create`, `changeAccess`, `resetPassword` nhận `@CurrentActor()` và ưu tiên `displayName` của phiên thay cho `actorName` do client gửi.
- FE: `apps/web/src/features/tenant-system/access-control/tenant-auth` (types, constants, `api/client.ts`, `hooks/session.tsx`, `components/page.tsx`, primitives riêng, `index.ts`); route `apps/web/src/app/tenant-system/auth/page.tsx`; `modules.json` bỏ `frontend: false`.
- `SessionProvider` bọc toàn ứng dụng trong `core/context/providers.tsx`; `AppShell` giữ route đăng nhập không chrome, chặn mọi route khác khi chưa đăng nhập hoặc còn `mustChangePassword` (redirect về `/tenant-system/auth`), và popover tài khoản hiển thị tên/vai trò thật cùng nút **Đăng xuất**.
- Màn hình đăng nhập có ba trạng thái: đăng nhập, tạo quản trị đầu tiên, đổi mật khẩu lần đầu (bắt buộc trước khi vào ứng dụng); mật khẩu mới phải khác mật khẩu hiện tại.
- Test: `tests/api.integration.test.mjs` bootstrap + đăng nhập trong `beforeEach`, mọi request mang cookie, thêm test "the API rejects anonymous calls until the tenant has a session"; `tests/fixtures.ts` tạo quản trị và đổi mật khẩu ban đầu cho mọi e2e; `tests/auth.spec.ts` phủ redirect, đăng xuất, sai mật khẩu, đổi mật khẩu bắt buộc; `tests/accounts.spec.ts` chuyển sang dùng tài khoản quản trị của fixture.

### Kết quả gate tenant-system/auth (31/10/2026)

| Lệnh                                 | Kết quả                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| `npm run architecture:check`         | Đạt — 14 implementation (9 record, 5 resource), 17 model            |
| `npm run test:architecture`          | Đạt 13/13                                                           |
| `npm run unused:check`               | Đạt — 409 file reachable                                            |
| `npm run tokens:check`               | Đạt — 187 token                                                     |
| `npm run typecheck` / `npm run lint` | Đạt                                                                 |
| `npm run build`                      | Đạt — có route `/tenant-system/auth`                                |
| `npm run test:api`                   | Đạt 16/16 (thêm test chặn gọi ẩn danh)                              |
| `npm run test:e2e`                   | Đạt 11/11 (thêm `auth.spec.ts`, `accounts.spec.ts` chạy theo phiên) |
| `npm run format:check`               | Không đạt do nợ CRLF có sẵn; mọi file đã sửa đạt `prettier -c`      |

### `tenant-system/access-control/roles-permissions` — 31/10/2026

- Phạm vi: ma trận quyền theo chức năng cho hai vai trò `EMPLOYEE`/`MANAGER`. `manage` không bao giờ gán qua ma trận; chỉ tài khoản `isSystemAdmin` giữ quyền quản trị.
- Mặc định tính trong mã: Quản lý có `view/create/update/delete/approve` (riêng chính ma trận chỉ `view`), Nhân viên chỉ `view` ở miền nghiệp vụ và không có quyền ở miền `tenant-system`. Bảng `role_permissions` chỉ lưu ô đã tùy chỉnh, nên database mới chạy đúng mà không cần seed.
- Danh mục 39 khóa quyền phản chiếu `feature-structure.json`; `calendar`/`reports` kế thừa `work-management/coordination/workspace-today` thay vì mở khóa riêng.
- API: `GET /api/v1/permissions` (`view` trên chính ma trận), `GET /api/v1/permissions/me` (chỉ cần phiên, dùng để ẩn/hiện thao tác), `GET /api/v1/permissions/history` (`view`), `PUT /api/v1/permissions` (`@AdminOnly` + `update`, `@HttpCode(200)`).
- Ghi: nhiều ô trong một transaction `RepeatableRead`; `version: 0` nghĩa là ô còn mặc định, mọi lần ghi sau phải khớp version đã đọc (lệch trả `409`); dòng lặp hoặc chứa `manage` trả `422`; khóa ngoài danh mục trả `400`; ô không đổi bị bỏ qua, không tăng version.
- Lịch sử: mỗi ô thực sự thay đổi sinh một dòng `PermissionChange` (from → to, người thực hiện, lý do) trong cùng transaction. Nhật ký hệ thống tập trung vẫn thuộc `tenant-system/checklog`.
- Hạ tầng: `apps/api/src/core/auth/actor-context.ts` thêm `PERMISSION_ACTIONS`, `PermissionAction`, `@RequirePermission(feature, action)`. Feature tự viết `PermissionGuard` đọc metadata này rồi hỏi `RolesPermissionsService.can()`, nên chức năng khác bảo vệ route mà không import feature này.
- Cưỡng chế: `TenantSystemModule` đăng ký thêm `{ provide: APP_GUARD, useExisting: PermissionGuard }` sau `SessionGuard`. Route không có metadata giữ nguyên hành vi cũ.
- Dữ liệu: schema `tenant_permissions`, model `RolePermission`/`PermissionChange`, migration `20261031140000_tenant_permissions` (sinh bằng `migrate diff --from-config-datasource`, đã review chỉ gồm schema/bảng/chỉ mục rồi `migrate deploy`; không reset vì drift có sẵn của `20261030120000_notification_soft_delete`).
- Route web: `/tenant-system/roles-permissions` — thẻ thống kê, tìm kiếm, lọc nhóm, bảng desktop + thẻ mobile, checkbox cho 5 hành động gán được, ô lý do, lưu/bỏ thay đổi và lịch sử. Quản trị hệ thống sửa được; vai trò khác thấy chế độ chỉ xem hoặc bị từ chối kèm thông báo.
- Integration: `feature-registry.ts`, `tenant-system.module.ts`, `tenant-system/index.ts`, `modules.json` (`kind: "resource"`), `base.prisma`.
- Test: `tests/api.integration.test.mjs` (mặc định, chặn/mở theo vai trò, `400`/`422`/`409`, lịch sử) và `tests/roles-permissions.spec.ts`.

### Kết quả gate tenant-system/roles-permissions (31/10/2026)

| Lệnh                                 | Kết quả                                                        |
| ------------------------------------ | -------------------------------------------------------------- |
| `npm run architecture:check`         | Đạt — 15 implementation (9 record, 6 resource), 19 model       |
| `npm run unused:check`               | Đạt — 429 file reachable                                       |
| `npm run tokens:check`               | Đạt — 187 token                                                |
| `npm run typecheck` / `npm run lint` | Đạt                                                            |
| `npm run build`                      | Đạt — thêm `/tenant-system/roles-permissions`                  |
| `npm run test:api`                   | Đạt 17/17 (thêm journey ma trận quyền)                         |
| `npm run test:e2e`                   | Đạt 12/12 (thêm `tests/roles-permissions.spec.ts`)             |
| `npm run format:check`               | Không đạt do nợ CRLF có sẵn; mọi file đã sửa đạt `prettier -c` |

Hai điểm cần biết khi vận hành:

- `prisma migrate dev` vẫn từ chối vì drift có sẵn; migration mới được sinh bằng `prisma migrate diff --from-config-datasource --to-schema packages/database/prisma/schema --script`, review SQL rồi `prisma migrate deploy`.
- Trên Windows phải đặt `TEST_DATABASE_URL` (database `..._test`) và `PLAYWRIGHT_CHROME_PATH` trỏ tới `chrome.exe` trước khi chạy `test:api`/`test:e2e`, vì mặc định của repo là database cổng `55432` và Chrome trên macOS.
- Ma trận quyền chưa gắn vào các route CRUD hiện có (chưa có `@RequirePermission` ngoài chính ma trận); khi một chức năng được chuyển sang dùng ma trận, chỉ cần thêm decorator, không phải sửa guard.

### `tenant-system/checklog` — 31/10/2026

- Phạm vi: nhật ký hệ thống chỉ ghi thêm, đọc được theo bộ lọc, không có đường sửa hoặc xóa. Mỗi bản ghi giữ chức năng phát sinh, hành động, đối tượng, nội dung, lý do, giá trị trước/sau, người thực hiện, vai trò, cờ quản trị hệ thống, cờ vượt phạm vi và kết quả.
- Dữ liệu: schema `tenant_checklog`, model `AuditEntry` (`audit_entries`), migration `20261031160000_tenant_checklog` sinh bằng `migrate diff --from-config-datasource`, đã review chỉ gồm schema/bảng/4 chỉ mục rồi `migrate deploy`. Model không có `updatedAt`; repository chỉ có `insert`, không có `update`/`delete`.
- API: `GET /api/v1/checklog` (`view`, phân trang), `GET /api/v1/checklog/facets` (`view`, đếm theo chức năng và hành động), `GET /api/v1/checklog/:id` (`view`, chi tiết). Query `.strict()` nhận `q`, `feature`, `action`, `actor`, `result`, `override`, `from`, `to`, `page`, `pageSize`; khóa lạ hoặc ngày sai trả `400`. `total` luôn là tổng theo bộ lọc, không phải số dòng của trang.
- Ghi: `ChecklogService.record(entries, actor, tx?)` là cửa duy nhất. Sink tự gắn người thực hiện từ `ActorContext`, chuẩn hóa JSON và che bí mật theo khóa (`password`, `token`, `secret`, `hash`, `credential`, `authorization`, `cookie`, …) trong `audit-redaction.ts`, nên producer không phải nhớ che dữ liệu. Nhận `Transaction` để bản ghi commit cùng thay đổi nghiệp vụ.
- Producer đầu tiên: `tenant-system/access-control/roles-permissions` khai báo `audit.port.ts` (`PERMISSION_AUDIT`), module chuyển sang `forRoot({ audit, imports })`; `apps/api/src/features/tenant-system/permission-audit.ts` là adapter composition nối vào sink. Không có import chéo feature → feature. Mỗi ô quyền thực sự đổi sinh một bản ghi `PERMISSION_CHANGE` với `featureKey` là chức năng bị đổi quyền, `targetType: "RolePermission"`, `targetId` là vai trò, `before/after` là `{ actions: [...] }`, lý do lấy từ yêu cầu lưu.
- Cưỡng chế: `tenant-system/checklog` nằm trong danh mục quyền; quản lý mặc định có `view`, nhân viên không có quyền ở miền `tenant-system`, quản trị hệ thống luôn xem được. Thiếu quyền trả `403` và giao diện hiển thị thông báo từ chối thay vì lỗi.
- Route web: `/tenant-system/checklog` — thẻ thống kê, tìm kiếm có debounce, lọc chức năng/hành động/kết quả/phạm vi/khoảng ngày, bảng desktop + thẻ mobile, phân trang, panel chi tiết hiển thị JSON trước/sau đã che, trạng thái loading/empty/error/denied.
- Integration: `feature-registry.ts`, `tenant-system.module.ts`, `tenant-system/index.ts`, `roles-permissions/index.ts` (export port), `modules.json`, `base.prisma`.
- Test: `tests/api.integration.test.mjs` (bản ghi sinh ra từ thay đổi quyền, một bản ghi mỗi ô đổi, `409` không để lại dấu vết, lọc/phân trang, query nghiêm ngặt, route ghi trả `404`, nhân viên `403`) và `tests/checklog.spec.ts`.
- Chưa làm: các chức năng khác chưa có producer port (sẽ thêm khi chức năng đó được triển khai); chưa có xuất tệp, chính sách lưu trữ hay nén nhật ký.

### Kết quả gate tenant-system/checklog (31/10/2026)

| Lệnh                                 | Kết quả                                                        |
| ------------------------------------ | -------------------------------------------------------------- |
| `npm run architecture:check`         | Đạt — 16 implementation (9 record, 7 resource), 20 model       |
| `npm run unused:check`               | Đạt — 453 file reachable                                       |
| `npm run tokens:check`               | Đạt — 187 token                                                |
| `npm run typecheck` / `npm run lint` | Đạt                                                            |
| `npm run build`                      | Đạt — thêm `/tenant-system/checklog`                           |
| `npm run test:api`                   | Đạt 18/18 (thêm journey nhật ký hệ thống)                      |
| `npm run test:e2e`                   | Đạt 13/13 (thêm `tests/checklog.spec.ts`)                      |
| `npm run format:check`               | Không đạt do nợ CRLF có sẵn; mọi file đã sửa đạt `prettier -c` |

### Chưa triển khai sau Phase 1

Toàn bộ Phase 2–9 theo thứ tự phụ thuộc ở mục 7. `tenant-system/checklog` đã có mặt nhưng mới nhận bản ghi từ ma trận quyền; các chức năng khác cần tự khai báo port khi được triển khai.
