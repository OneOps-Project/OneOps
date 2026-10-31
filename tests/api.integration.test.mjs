import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import modules from "../modules.json" with { type: "json" };
import {
  databaseUrl,
  cleanDatabase,
  runSql,
} from "../apps/api/test/database.mjs";
let app, origin, createApp;
const statuses = {
  "workspace-today": "Đang dùng",
  "project-spaces": "Lên kế hoạch",
  calendar: "Đã lên lịch",
  "tickets-approvals": "Chờ duyệt",
  "internal-chat": "Đang mở",
  "knowledge-sop": "Bản nháp",
  reports: "Bản nháp",
};
/** Tasks never accept a status on create; the workflow is the only writer. */
const input = (module = "tasks", patch = {}) => ({
  code: "WORK-01",
  name: "Công việc kiểm thử",
  date: "2026-11-15",
  ...(statuses[module] ? { status: statuses[module] } : {}),
  fields: {},
  ...patch,
});
const ADMIN = {
  username: "  Quan.Ly ",
  displayName: "Phạm Quản Lý",
  email: "Quan.Ly@OneOps.vn",
  employeeCode: "EMP-01",
  role: "MANAGER",
  isSystemAdmin: true,
  password: "mat-khau-01",
  actorName: "Quản trị viên",
};
let cookie = "";
let adminId = "";
async function request(route, method = "GET", body, headers = {}) {
  const response = await fetch(`${origin}/api/v1${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
/** One approved workflow move; returns the refreshed task snapshot. */
async function transition(task, toStatus, patch = {}, headers = {}) {
  const result = await request(
    `/task-workflow/tasks/${task.id}/transitions`,
    "POST",
    { toStatus, version: task.version, ...patch },
    headers,
  );
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.task;
}
async function completeTask(task) {
  const started = await transition(task, "Đang làm");
  const review = await transition(started, "Chờ kiểm tra");
  return transition(review, "Hoàn thành");
}
async function signIn(username, password) {
  const response = await fetch(`${origin}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: (response.headers.get("set-cookie") ?? "").split(";")[0],
  };
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, predicate, timeout = 3000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await check();
    if (predicate(value)) return value;
    await sleep(25);
  }
  throw new Error("Timed out waiting for notifications");
}
before(async () => {
  const migration = spawnSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
      "--config",
      "packages/database/prisma.config.ts",
    ],
    { env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8" },
  );
  assert.equal(migration.status, 0, migration.stderr);
  process.env.DATABASE_URL = databaseUrl;
  process.env.NODE_ENV = "test";
  ({ createApp } = await import("../apps/api/dist/bootstrap.js"));
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  origin = await app.getUrl();
});
after(async () => {
  await app?.close();
});
beforeEach(async () => {
  await cleanDatabase();
  cookie = "";
  const created = await request("/accounts", "POST", ADMIN);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  adminId = created.body.id;
  const signed = await signIn("quan.ly", ADMIN.password);
  assert.equal(signed.status, 200, JSON.stringify(signed.body));
  cookie = signed.cookie;
});
test("the API rejects anonymous calls until the tenant has a session", async () => {
  const anonymous = await fetch(`${origin}/api/v1/tasks`);
  assert.equal(anonymous.status, 401);
  const forged = await fetch(`${origin}/api/v1/tasks`, {
    headers: { Cookie: "oneops_session=gia-mao" },
  });
  assert.equal(forged.status, 401);
  assert.equal((await request("/tasks")).status, 200);
});
test("data implementations own separate CRUD APIs, codes, records and namespaces", async () => {
  for (const module of modules.filter(
    (module) =>
      module.route !== "notifications" &&
      (module.kind ?? "records") === "records",
  )) {
    const created = await request(
      "/" + module.route,
      "POST",
      input(module.name),
    );
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.module, module.route);
    const list = await request("/" + module.route);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].id, created.body.id);
  }
  const task = (await request("/tasks")).body.items[0];
  assert.equal((await request("/projects/" + task.id)).status, 404);
});
test("organization resource keeps departments and teams versioned without hard delete", async () => {
  const department = await request("/org/departments", "POST", {
    code: " hr-01 ",
    name: "Phòng Nhân sự",
    managerName: "Nguyễn An",
  });
  assert.equal(department.status, 201, JSON.stringify(department.body));
  assert.equal(department.body.code, "hr-01");
  assert.equal(department.body.status, "ACTIVE");
  assert.equal(department.body.teamCount, 0);
  assert.equal(department.body.activeTeamCount, 0);
  assert.equal(department.body.version, 1);
  assert.equal(
    (
      await request("/org/departments", "POST", {
        code: "HR-01",
        name: "Phòng trùng mã",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/org/departments", "POST", {
        code: "HR-02",
        name: "Phòng lạ",
        unknown: true,
      })
    ).status,
    400,
  );
  const team = await request("/org/teams", "POST", {
    departmentId: department.body.id,
    code: "HR-A",
    name: "Nhóm Tuyển dụng",
    description: "Tuyển dụng nội bộ",
    managerName: "Trần Bình",
  });
  assert.equal(team.status, 201, JSON.stringify(team.body));
  const list = await request(`/org/teams?departmentId=${department.body.id}`);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].id, team.body.id);
  assert.equal((await request("/org/departments")).body.items[0].teamCount, 1);
  assert.equal(
    (await request("/org/departments")).body.items[0].activeTeamCount,
    1,
  );
  const blocked = await request(
    `/org/departments/${department.body.id}`,
    "PATCH",
    { version: 1, status: "INACTIVE" },
  );
  assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
  const renamed = await request(`/org/teams/${team.body.id}`, "PATCH", {
    version: 1,
    name: "Nhóm Tuyển dụng & Đào tạo",
  });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.name, "Nhóm Tuyển dụng & Đào tạo");
  assert.equal(renamed.body.description, "Tuyển dụng nội bộ");
  assert.equal(renamed.body.managerName, "Trần Bình");
  assert.equal(renamed.body.status, "ACTIVE");
  assert.equal(renamed.body.version, 2);
  assert.equal(
    (
      await request(`/org/teams/${team.body.id}`, "PATCH", {
        version: 1,
        status: "INACTIVE",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/org/teams/${team.body.id}`, "PATCH", {
        version: 2,
        status: "INACTIVE",
      })
    ).status,
    200,
  );
  const afterDeactivation = (await request("/org/departments")).body.items[0];
  assert.equal(afterDeactivation.teamCount, 1);
  assert.equal(afterDeactivation.activeTeamCount, 0);
  assert.equal(
    (
      await request(`/org/departments/${department.body.id}`, "PATCH", {
        version: 1,
        status: "INACTIVE",
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(`/org/teams/${team.body.id}`, "DELETE", { version: 3 }))
      .status,
    404,
  );
});
test("positions and grades keep optional linkage and reject invalid rank", async () => {
  const position = await request("/org/positions", "POST", {
    code: "P-01",
    name: "Kỹ sư phần mềm",
  });
  assert.equal(position.status, 201, JSON.stringify(position.body));
  assert.equal(position.body.gradeCount, 0);
  assert.equal(
    (
      await request("/org/positions", "POST", {
        code: "p-01",
        name: "Chức danh trùng mã",
      })
    ).status,
    409,
  );
  const grade = await request("/org/grades", "POST", {
    code: "G-01",
    name: "Bậc 1",
    rank: 1,
    positionId: position.body.id,
  });
  assert.equal(grade.status, 201, JSON.stringify(grade.body));
  assert.equal(grade.body.positionId, position.body.id);
  assert.equal((await request("/org/positions")).body.items[0].gradeCount, 1);
  assert.equal(
    (await request(`/org/grades?positionId=${position.body.id}`)).body.total,
    1,
  );
  const loose = await request("/org/grades", "POST", {
    code: "G-02",
    name: "Bậc chưa gắn",
    rank: 3,
    description: "Bậc dự phòng",
  });
  assert.equal(loose.status, 201, JSON.stringify(loose.body));
  assert.equal(loose.body.positionId, null);
  assert.equal((await request("/org/grades")).body.total, 2);
  const linked = await request(`/org/grades/${loose.body.id}`, "PATCH", {
    version: 1,
    positionId: position.body.id,
  });
  assert.equal(linked.status, 200);
  assert.equal(linked.body.positionId, position.body.id);
  assert.equal(linked.body.rank, 3);
  assert.equal(linked.body.description, "Bậc dự phòng");
  assert.equal(linked.body.status, "ACTIVE");
  const unlinked = await request(`/org/grades/${loose.body.id}`, "PATCH", {
    version: 2,
    positionId: null,
  });
  assert.equal(unlinked.status, 200);
  assert.equal(unlinked.body.positionId, null);
  assert.equal(
    (
      await request("/org/grades", "POST", {
        code: "G-03",
        name: "Sai thứ tự",
        rank: 0,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/org/grades", "POST", {
        code: "G-04",
        name: "Thứ tự dạng chuỗi",
        rank: "2",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/org/grades", "POST", {
        code: "G-05",
        name: "Chức danh không tồn tại",
        positionId: "00000000-0000-4000-8000-000000000000",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(`/org/positions/${position.body.id}`, "DELETE", {
        version: 1,
      })
    ).status,
    404,
  );
});
test("employee directory keeps versioned profiles, unique email and no hard delete", async () => {
  const employee = await request("/employees", "POST", {
    code: " emp-01 ",
    fullName: "Nguyễn An",
    email: "An.Nguyen@OneOps.vn",
    jobTitle: "Developer",
    departmentName: "Phòng Nhân sự",
    teamName: "Nhóm Tuyển dụng",
    startDate: "2026-01-15",
  });
  assert.equal(employee.status, 201, JSON.stringify(employee.body));
  assert.equal(employee.body.code, "emp-01");
  assert.equal(employee.body.email, "An.Nguyen@OneOps.vn");
  assert.equal(employee.body.startDate, "2026-01-15");
  assert.equal(employee.body.status, "ACTIVE");
  assert.equal(employee.body.version, 1);
  assert.equal(
    (
      await request("/employees", "POST", {
        code: "EMP-01",
        fullName: "Trùng mã",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/employees", "POST", {
        code: "EMP-02",
        fullName: "Trùng email",
        email: "an.nguyen@oneops.vn",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/employees", "POST", {
        code: "EMP-03",
        fullName: "Email sai",
        email: "khong-phai-email",
      })
    ).status,
    400,
  );
  const noEmail = await request("/employees", "POST", {
    code: "EMP-04",
    fullName: "Lê Bình",
  });
  const otherNoEmail = await request("/employees", "POST", {
    code: "EMP-05",
    fullName: "Trần Chi",
  });
  assert.equal(noEmail.status, 201, JSON.stringify(noEmail.body));
  assert.equal(otherNoEmail.status, 201, JSON.stringify(otherNoEmail.body));
  assert.equal(noEmail.body.email, "");
  const renamed = await request(`/employees/${employee.body.id}`, "PATCH", {
    version: 1,
    fullName: "Nguyễn An Bình",
  });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.fullName, "Nguyễn An Bình");
  assert.equal(renamed.body.jobTitle, "Developer");
  assert.equal(renamed.body.version, 2);
  assert.equal(
    (
      await request(`/employees/${employee.body.id}`, "PATCH", {
        version: 1,
        fullName: "Ghi đè cũ",
      })
    ).status,
    409,
  );
  const left = await request(`/employees/${employee.body.id}`, "PATCH", {
    version: 2,
    status: "INACTIVE",
  });
  assert.equal(left.status, 200);
  assert.equal(left.body.status, "INACTIVE");
  assert.equal((await request("/employees?status=INACTIVE")).body.total, 1);
  assert.equal((await request("/employees?q=chuyên")).body.total, 0);
  assert.equal((await request("/employees?q=developer")).body.total, 1);
  assert.equal(
    (await request(`/employees/${employee.body.id}`, "DELETE", { version: 3 }))
      .status,
    404,
  );
});
test("accounts keep roles, access history and the last manager guard", async () => {
  const manager = await request(`/accounts/${adminId}`);
  assert.equal(manager.status, 200, JSON.stringify(manager.body));
  assert.equal(manager.body.username, "Quan.Ly");
  assert.equal(manager.body.role, "MANAGER");
  assert.equal(manager.body.isSystemAdmin, true);
  assert.equal(manager.body.mustChangePassword, true);
  assert.equal(manager.body.version, 1);
  assert.equal("passwordHash" in manager.body, false);
  assert.equal(
    (
      await request("/accounts", "POST", {
        username: "quan.ly",
        displayName: "Trùng tên",
        password: "mat-khau-02",
        actorName: "Quản trị viên",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/accounts", "POST", {
        username: "nhan.vien",
        displayName: "Trùng email",
        email: "quan.ly@oneops.vn",
        password: "mat-khau-02",
        actorName: "Quản trị viên",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/accounts", "POST", {
        username: "thieu.mat.khau",
        displayName: "Mật khẩu ngắn",
        password: "123",
        actorName: "Quản trị viên",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/accounts", "POST", {
        username: "sai.quyen",
        displayName: "Admin không phải quản lý",
        role: "EMPLOYEE",
        isSystemAdmin: true,
        password: "mat-khau-03",
        actorName: "Quản trị viên",
      })
    ).status,
    422,
  );
  const employee = await request("/accounts", "POST", {
    username: "nhan.vien",
    displayName: "Đỗ Nhân Viên",
    password: "mat-khau-04",
    actorName: "Quản trị viên",
  });
  assert.equal(employee.status, 201, JSON.stringify(employee.body));
  assert.equal(employee.body.role, "EMPLOYEE");
  const renamed = await request(`/accounts/${employee.body.id}`, "PATCH", {
    version: 1,
    displayName: "Đỗ Nhân Viên B",
  });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.displayName, "Đỗ Nhân Viên B");
  assert.equal(renamed.body.role, "EMPLOYEE");
  assert.equal(renamed.body.status, "ACTIVE");
  assert.equal(
    (
      await request(`/accounts/${manager.body.id}/access`, "POST", {
        role: "EMPLOYEE",
        actorName: "Quản trị viên",
        reason: "Hạ quyền quản lý cuối cùng",
        version: 1,
      })
    ).status,
    422,
  );
  const promoted = await request(
    `/accounts/${employee.body.id}/access`,
    "POST",
    {
      role: "MANAGER",
      actorName: "Quản trị viên",
      reason: "Bổ nhiệm quản lý",
      version: 2,
    },
  );
  assert.equal(promoted.status, 200, JSON.stringify(promoted.body));
  assert.equal(promoted.body.role, "MANAGER");
  const granted = await request(
    `/accounts/${employee.body.id}/access`,
    "POST",
    {
      isSystemAdmin: true,
      actorName: "Quản trị viên",
      reason: "Cấp quyền quản trị hệ thống",
      version: 3,
    },
  );
  assert.equal(granted.status, 200, JSON.stringify(granted.body));
  assert.equal(granted.body.isSystemAdmin, true);
  // Quản trị vừa được cấp quyền tiếp quản các thao tác, để phép hạ quyền
  // không tự tước quyền của chính phiên đang gọi.
  const promotedSignIn = await signIn("nhan.vien", "mat-khau-04");
  assert.equal(promotedSignIn.status, 200, JSON.stringify(promotedSignIn.body));
  cookie = promotedSignIn.cookie;
  const demoted = await request(`/accounts/${manager.body.id}/access`, "POST", {
    role: "EMPLOYEE",
    isSystemAdmin: false,
    actorName: "Quản trị viên",
    reason: "Chuyển sang nhân viên",
    version: 1,
  });
  assert.equal(demoted.status, 200, JSON.stringify(demoted.body));
  assert.equal(demoted.body.role, "EMPLOYEE");
  assert.equal(demoted.body.isSystemAdmin, false);
  assert.equal(
    (
      await request(`/accounts/${manager.body.id}/access`, "POST", {
        isSystemAdmin: true,
        actorName: "Quản trị viên",
        version: 1,
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await request(`/accounts/${employee.body.id}/access`, "POST", {
        isSystemAdmin: false,
        actorName: "Quản trị viên",
        version: 4,
      })
    ).status,
    422,
  );
  const locked = await request(`/accounts/${employee.body.id}/access`, "POST", {
    status: "LOCKED",
    lockedReason: "Thử khóa quản lý cuối cùng",
    actorName: "Quản trị viên",
    version: 4,
  });
  assert.equal(locked.status, 422);
  const password = await request(
    `/accounts/${employee.body.id}/password`,
    "POST",
    {
      password: "mat-khau-moi",
      actorName: "Quản trị viên",
      version: 4,
    },
  );
  assert.equal(password.status, 200, JSON.stringify(password.body));
  assert.equal(password.body.mustChangePassword, true);
  assert.equal(password.body.version, 5);
  assert.equal(
    (
      await request(`/accounts/${employee.body.id}/password`, "POST", {
        password: "mat-khau-moi-2",
        actorName: "Quản trị viên",
        version: 1,
      })
    ).status,
    409,
  );
  const history = await request(`/accounts/${employee.body.id}/history`);
  assert.equal(history.status, 200);
  const kinds = history.body.items.map((item) => item.kind);
  assert.deepEqual(kinds.sort(), ["ADMIN", "PASSWORD", "ROLE", "ROLE"]);
  assert.equal((await request("/accounts?role=MANAGER")).body.total, 1);
  assert.equal((await request("/accounts?q=nhan.vien")).body.total, 1);
  assert.equal(
    (await request(`/accounts/${employee.body.id}`, "DELETE", {})).status,
    404,
  );
});
test("permission matrix keeps defaults, tenant overrides and versioned writes", async () => {
  const SELF = "tenant-system/access-control/roles-permissions";
  const TASKS = "work-management/work/tasks";
  const rowOf = (payload, featureKey, role) =>
    payload.items.find(
      (item) => item.featureKey === featureKey && item.role === role,
    );
  const actionsOf = (payload, featureKey) =>
    payload.items.find((item) => item.featureKey === featureKey)?.actions;
  const adminCookie = cookie;

  const mine = await request("/permissions/me");
  assert.equal(mine.status, 200, JSON.stringify(mine.body));
  assert.equal(mine.body.role, "MANAGER");
  assert.equal(mine.body.canManage, true);
  assert.ok(
    mine.body.items.every((item) => item.actions.includes("manage")),
    "quản trị hệ thống phải có đủ quyền",
  );

  const matrix = await request("/permissions");
  assert.equal(matrix.status, 200, JSON.stringify(matrix.body));
  assert.deepEqual(matrix.body.roles, ["EMPLOYEE", "MANAGER"]);
  const featureKeys = new Set(matrix.body.items.map((item) => item.featureKey));
  assert.equal(matrix.body.items.length, featureKeys.size * 2);
  assert.ok(
    matrix.body.items.every((item) => item.isDefault && item.version === 0),
    "ma trận mới phải ở trạng thái mặc định",
  );
  assert.deepEqual(rowOf(matrix.body, SELF, "MANAGER").actions, ["view"]);
  assert.deepEqual(rowOf(matrix.body, SELF, "EMPLOYEE").actions, []);
  assert.deepEqual(rowOf(matrix.body, TASKS, "EMPLOYEE").actions, ["view"]);
  assert.deepEqual(rowOf(matrix.body, TASKS, "MANAGER").actions, [
    "view",
    "create",
    "update",
    "delete",
    "approve",
  ]);

  // Invalid payloads are refused before anything is written.
  assert.equal(
    (
      await request("/permissions", "PUT", {
        items: [
          { featureKey: "khong/co", role: "EMPLOYEE", actions: [], version: 0 },
        ],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/permissions", "PUT", {
        items: [
          {
            featureKey: SELF,
            role: "EMPLOYEE",
            actions: ["manage"],
            version: 0,
          },
        ],
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await request("/permissions", "PUT", {
        items: [
          { featureKey: SELF, role: "EMPLOYEE", actions: [], version: 0 },
          {
            featureKey: SELF,
            role: "EMPLOYEE",
            actions: ["view"],
            version: 0,
          },
        ],
      })
    ).status,
    422,
  );

  const createdEmployee = await request("/accounts", "POST", {
    username: "nhan.vien",
    displayName: "Đỗ Nhân Viên",
    password: "mat-khau-04",
    actorName: "Quản trị viên",
  });
  assert.equal(
    createdEmployee.status,
    201,
    JSON.stringify(createdEmployee.body),
  );
  const employeeSignIn = await signIn("nhan.vien", "mat-khau-04");
  assert.equal(employeeSignIn.status, 200, JSON.stringify(employeeSignIn.body));
  cookie = employeeSignIn.cookie;
  const employeeMine = await request("/permissions/me");
  assert.equal(employeeMine.status, 200, JSON.stringify(employeeMine.body));
  assert.equal(employeeMine.body.canManage, false);
  assert.deepEqual(actionsOf(employeeMine.body, SELF), []);
  assert.deepEqual(actionsOf(employeeMine.body, TASKS), ["view"]);
  assert.ok(
    employeeMine.body.items.every((item) => !item.actions.includes("manage")),
    "nhân viên không bao giờ nhận quyền quản trị ma trận",
  );
  assert.equal((await request("/permissions")).status, 403);
  assert.equal((await request("/permissions/history")).status, 403);
  assert.equal(
    (
      await request("/permissions", "PUT", {
        items: [
          { featureKey: SELF, role: "EMPLOYEE", actions: ["view"], version: 0 },
        ],
      })
    ).status,
    403,
  );

  cookie = adminCookie;
  const granted = await request("/permissions", "PUT", {
    items: [
      { featureKey: SELF, role: "EMPLOYEE", actions: ["view"], version: 0 },
    ],
    reason: "Cho nhân viên xem ma trận",
  });
  assert.equal(granted.status, 200, JSON.stringify(granted.body));
  const grantedRow = rowOf(granted.body, SELF, "EMPLOYEE");
  assert.deepEqual(grantedRow.actions, ["view"]);
  assert.equal(grantedRow.version, 1);
  assert.equal(grantedRow.isDefault, false);
  assert.deepEqual(rowOf(granted.body, SELF, "MANAGER").actions, ["view"]);

  const unchanged = await request("/permissions", "PUT", {
    items: [
      { featureKey: SELF, role: "EMPLOYEE", actions: ["view"], version: 1 },
    ],
  });
  assert.equal(unchanged.status, 200, JSON.stringify(unchanged.body));
  assert.equal(rowOf(unchanged.body, SELF, "EMPLOYEE").version, 1);
  const history = await request("/permissions/history");
  assert.equal(history.status, 200, JSON.stringify(history.body));
  assert.equal(history.body.items.length, 1);
  assert.deepEqual(history.body.items[0].fromActions, []);
  assert.deepEqual(history.body.items[0].toActions, ["view"]);
  assert.equal(history.body.items[0].reason, "Cho nhân viên xem ma trận");
  assert.equal(history.body.items[0].actorName, ADMIN.displayName);

  cookie = employeeSignIn.cookie;
  assert.equal((await request("/permissions")).status, 200);
  assert.equal((await request("/permissions/history")).status, 200);
  cookie = adminCookie;
  assert.equal(
    (
      await request("/permissions", "PUT", {
        items: [
          {
            featureKey: SELF,
            role: "EMPLOYEE",
            actions: ["view", "create"],
            version: 0,
          },
        ],
      })
    ).status,
    409,
  );
  const revoked = await request("/permissions", "PUT", {
    items: [{ featureKey: SELF, role: "EMPLOYEE", actions: [], version: 1 }],
    reason: "Thu hồi quyền xem ma trận",
  });
  assert.equal(revoked.status, 200, JSON.stringify(revoked.body));
  assert.equal(rowOf(revoked.body, SELF, "EMPLOYEE").version, 2);
  assert.deepEqual(rowOf(revoked.body, SELF, "EMPLOYEE").actions, []);
  assert.equal((await request("/permissions/history")).body.items.length, 2);
  cookie = employeeSignIn.cookie;
  assert.equal((await request("/permissions")).status, 403);

  cookie = adminCookie;
  const manager = await request("/accounts", "POST", {
    username: "quan.ly.2",
    displayName: "Lê Quản Lý",
    role: "MANAGER",
    password: "mat-khau-05",
    actorName: "Quản trị viên",
  });
  assert.equal(manager.status, 201, JSON.stringify(manager.body));
  const managerSignIn = await signIn("quan.ly.2", "mat-khau-05");
  assert.equal(managerSignIn.status, 200, JSON.stringify(managerSignIn.body));
  cookie = managerSignIn.cookie;
  const managerMine = await request("/permissions/me");
  assert.equal(managerMine.status, 200, JSON.stringify(managerMine.body));
  assert.equal(managerMine.body.canManage, false);
  assert.deepEqual(actionsOf(managerMine.body, SELF), ["view"]);
  assert.equal((await request("/permissions")).status, 200);
  assert.equal(
    (
      await request("/permissions", "PUT", {
        items: [
          { featureKey: SELF, role: "EMPLOYEE", actions: ["view"], version: 0 },
        ],
      })
    ).status,
    403,
  );
  cookie = adminCookie;
});
test("checklog records administration changes once and stays append-only", async () => {
  const SELF = "tenant-system/access-control/roles-permissions";
  const TASKS = "work-management/work/tasks";
  const adminCookie = cookie;

  const empty = await request("/checklog");
  assert.equal(empty.status, 200, JSON.stringify(empty.body));
  assert.deepEqual(empty.body, {
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
  });
  assert.deepEqual((await request("/checklog/facets")).body, {
    features: [],
    actions: [],
  });

  // The matrix feature writes through its audit port, so the entry commits
  // with the change itself.
  const granted = await request("/permissions", "PUT", {
    items: [
      { featureKey: SELF, role: "EMPLOYEE", actions: ["view"], version: 0 },
    ],
    reason: "Cho nhân viên xem ma trận",
  });
  assert.equal(granted.status, 200, JSON.stringify(granted.body));

  const listed = await request("/checklog");
  assert.equal(listed.status, 200, JSON.stringify(listed.body));
  assert.equal(listed.body.total, 1);
  const entry = listed.body.items[0];
  assert.equal(entry.featureKey, SELF);
  assert.equal(entry.action, "PERMISSION_CHANGE");
  assert.equal(entry.targetType, "RolePermission");
  assert.equal(entry.targetId, "EMPLOYEE");
  assert.deepEqual(entry.before, { actions: [] });
  assert.deepEqual(entry.after, { actions: ["view"] });
  assert.equal(entry.reason, "Cho nhân viên xem ma trận");
  assert.equal(entry.actorName, ADMIN.displayName);
  assert.equal(entry.actorRole, "MANAGER");
  assert.equal(entry.actorAccountId, adminId);
  assert.equal(entry.isSystemAdmin, true);
  assert.equal(entry.isOutOfScopeOverride, false);
  assert.equal(entry.result, "SUCCESS");
  assert.ok(!Number.isNaN(Date.parse(entry.createdAt)));

  const detail = await request(`/checklog/${entry.id}`);
  assert.equal(detail.status, 200, JSON.stringify(detail.body));
  assert.deepEqual(detail.body, entry);
  assert.deepEqual((await request("/checklog/facets")).body, {
    features: [{ key: SELF, count: 1 }],
    actions: [{ key: "PERMISSION_CHANGE", count: 1 }],
  });

  // One entry per changed cell: the unchanged MANAGER row writes nothing.
  const batch = await request("/permissions", "PUT", {
    items: [
      {
        featureKey: TASKS,
        role: "EMPLOYEE",
        actions: ["view", "create"],
        version: 0,
      },
      { featureKey: SELF, role: "MANAGER", actions: ["view"], version: 0 },
    ],
    reason: "Mở quyền tạo công việc",
  });
  assert.equal(batch.status, 200, JSON.stringify(batch.body));
  const afterBatch = await request("/checklog");
  assert.equal(afterBatch.body.total, 2);
  assert.equal(afterBatch.body.items[0].featureKey, TASKS);
  assert.equal(afterBatch.body.items[0].targetId, "EMPLOYEE");
  assert.deepEqual((await request("/checklog/facets")).body, {
    features: [
      { key: SELF, count: 1 },
      { key: TASKS, count: 1 },
    ],
    actions: [{ key: "PERMISSION_CHANGE", count: 2 }],
  });

  // A refused write leaves no trace to roll back.
  assert.equal(
    (
      await request("/permissions", "PUT", {
        items: [
          {
            featureKey: SELF,
            role: "EMPLOYEE",
            actions: ["view", "create"],
            version: 0,
          },
        ],
      })
    ).status,
    409,
  );
  assert.equal((await request("/checklog")).body.total, 2);

  const queries = {
    "/checklog?action=PERMISSION_CHANGE": 2,
    "/checklog?action=OTHER_ACTION": 0,
    [`/checklog?feature=${TASKS}`]: 1,
    "/checklog?q=EMPLOYEE": 2,
    "/checklog?q=khong-co-gi": 0,
    "/checklog?override=true": 0,
    "/checklog?override=false": 2,
    "/checklog?result=SUCCESS": 2,
    "/checklog?result=DENIED": 0,
    "/checklog?from=2020-01-01&to=2030-12-31": 2,
    "/checklog?from=2030-01-01": 0,
  };
  for (const [route, expected] of Object.entries(queries)) {
    const response = await request(route);
    assert.equal(
      response.status,
      200,
      `${route}: ${JSON.stringify(response.body)}`,
    );
    assert.equal(response.body.total, expected, route);
  }
  const paged = await request("/checklog?page=1&pageSize=1");
  assert.equal(paged.body.items.length, 1);
  assert.equal(paged.body.total, 2);
  assert.equal(paged.body.pageSize, 1);
  const beyond = await request("/checklog?page=2&pageSize=25");
  assert.equal(beyond.body.total, 2);
  assert.deepEqual(beyond.body.items, []);

  // The query is strict, and the surface has no write route at all.
  for (const route of [
    "/checklog?unknown=1",
    "/checklog?pageSize=500",
    "/checklog?result=OTHER",
    "/checklog?from=2026-13-01",
  ])
    assert.equal((await request(route)).status, 400, route);
  assert.equal((await request("/checklog/khong-phai-uuid")).status, 400);
  assert.equal(
    (await request("/checklog/00000000-0000-4000-8000-000000000000")).status,
    404,
  );
  assert.equal(
    (await request(`/checklog/${entry.id}`, "PATCH", { summary: "Sửa" }))
      .status,
    404,
  );
  assert.equal((await request(`/checklog/${entry.id}`, "DELETE")).status, 404);

  // Producers never have to remember to redact: the sink strips secret keys.
  const { redact, REDACTED } =
    await import("../apps/api/dist/features/tenant-system/checklog/audit-redaction.js");
  assert.deepEqual(
    redact({ password: "x", nested: { accessToken: "y" }, safe: 1 }),
    { password: REDACTED, nested: { accessToken: REDACTED }, safe: 1 },
  );

  const createdEmployee = await request("/accounts", "POST", {
    username: "nhan.vien.log",
    displayName: "Đỗ Nhân Viên",
    password: "mat-khau-06",
    actorName: "Quản trị viên",
  });
  assert.equal(
    createdEmployee.status,
    201,
    JSON.stringify(createdEmployee.body),
  );
  const employeeSignIn = await signIn("nhan.vien.log", "mat-khau-06");
  assert.equal(employeeSignIn.status, 200, JSON.stringify(employeeSignIn.body));
  cookie = employeeSignIn.cookie;
  assert.equal((await request("/checklog")).status, 403);
  assert.equal((await request("/checklog/facets")).status, 403);
  assert.equal((await request(`/checklog/${entry.id}`)).status, 403);
  cookie = adminCookie;
});
test("duplicate codes conflict; PATCH keeps omitted fields and stale writes are rejected", async () => {
  const created = (
    await request(
      "/tasks",
      "POST",
      input("tasks", {
        note: "Mô tả giữ nguyên",
        fields: { priority: "Cao", progress: 20 },
      }),
    )
  ).body;
  assert.equal(
    (await request("/tasks", "POST", input("tasks", { code: " work-01 " })))
      .status,
    409,
  );
  const saved = await request("/tasks/" + created.id, "PATCH", {
    version: 1,
    name: "Công việc kiểm thử (đã sửa)",
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.note, "Mô tả giữ nguyên");
  assert.equal(saved.body.fields.priority, "Cao");
  assert.equal(saved.body.version, 2);
  assert.equal(
    (
      await request("/tasks/" + created.id, "PATCH", {
        version: 1,
        name: "Ghi đè bằng phiên bản cũ",
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/tasks/" + created.id, "DELETE", { version: 1 })).status,
    409,
  );
  assert.equal(
    (await request("/tasks/" + created.id, "DELETE", { version: 2 })).status,
    200,
  );
});
test("strict domain validation rejects foreign fields, direct status writes, invalid dates and progress", async () => {
  for (const patch of [
    { name: " " },
    { status: "Không hợp lệ" },
    { status: "Đang làm" },
    { date: "2026-02-30" },
    { fields: { progress: 101 } },
    { fields: { beneficiary: "Không phải domain công việc" } },
    { fields: { priority: "Unknown" } },
  ])
    assert.equal(
      (await request("/tasks", "POST", input("tasks", patch))).status,
      400,
    );
  assert.equal(
    (
      await request(
        "/tasks",
        "POST",
        input("tasks", { fields: { startDate: "2026-12-01" } }),
      )
    ).status,
    400,
  );
  const task = (await request("/tasks", "POST", input())).body;
  assert.equal(
    (
      await request("/tasks/" + task.id, "PATCH", {
        version: 1,
        fields: { startDate: "2026-12-01" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/calendar",
        "POST",
        input("calendar", { fields: { startTime: "11:00", endTime: "10:00" } }),
      )
    ).status,
    400,
  );
  const event = (
    await request(
      "/calendar",
      "POST",
      input("calendar", { fields: { startTime: "10:00", endTime: "11:00" } }),
    )
  ).body;
  assert.equal(
    (
      await request("/calendar/" + event.id, "PATCH", {
        version: 1,
        fields: { startTime: "11:00", endTime: "10:00" },
      })
    ).status,
    400,
  );
});
test("checklists persist on tasks and comments live in their own feature", async () => {
  const task = (await request("/tasks", "POST", input())).body;
  const id = crypto.randomUUID();
  const result = await request("/tasks/" + task.id, "PATCH", {
    version: 1,
    fields: {
      checklist: [{ id, title: "Kiểm tra bàn giao", done: true }],
    },
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.fields.checklist[0].done, true);

  const comment = await request("/task-comments", "POST", {
    taskId: task.id,
    body: "Đã xác nhận",
    mentions: ["Minh"],
  });
  assert.equal(comment.status, 201, JSON.stringify(comment.body));
  assert.equal(comment.body.author, ADMIN.displayName);
  assert.deepEqual(comment.body.mentions, ["Minh"]);
  const list = await request("/task-comments?taskId=" + task.id);
  assert.equal(list.status, 200, JSON.stringify(list.body));
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].body, "Đã xác nhận");
  assert.equal(
    (await request("/task-comments/counts?taskIds=" + task.id)).body.items[0]
      .count,
    1,
  );
});
test("pagination, search, status and assignee filters stay within their domain", async () => {
  await request(
    "/tasks",
    "POST",
    input("tasks", {
      code: "TASK-A",
      name: "Thiết kế giao diện",
      assignee: "An",
    }),
  );
  const finished = (
    await request(
      "/tasks",
      "POST",
      input("tasks", {
        code: "TASK-B",
        name: "Kiểm thử",
        assignee: ADMIN.displayName,
      }),
    )
  ).body;
  await completeTask(finished);
  assert.equal(
    (await request("/tasks?page=1&pageSize=1")).body.items.length,
    1,
  );
  assert.equal(
    (await request("/tasks?q=" + encodeURIComponent("giao diện"))).body.total,
    1,
  );
  assert.equal(
    (await request("/tasks?status=" + encodeURIComponent("Hoàn thành"))).body
      .total,
    1,
  );
  assert.equal((await request("/tasks?assignee=An")).body.total, 1);
  assert.equal((await request("/projects")).body.total, 0);
});
test("only one concurrent write can use the same task version", async () => {
  const task = (await request("/tasks", "POST", input())).body;
  const results = await Promise.all([
    request("/tasks/" + task.id, "PATCH", { version: 1, name: "Nhánh A" }),
    request("/tasks/" + task.id, "PATCH", { version: 1, name: "Nhánh B" }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
});
test("workspace aggregates every task page and real project/request/calendar data", async () => {
  const created = [];
  for (let i = 0; i < 101; i++) {
    const task = await request(
      "/tasks",
      "POST",
      input("tasks", { code: "TASK-" + i, date: "2000-01-01" }),
    );
    assert.equal(task.status, 201, JSON.stringify(task.body));
    created.push(task.body);
  }
  for (const task of created.slice(0, 50)) await completeTask(task);
  await request("/projects", "POST", input("project-spaces"));
  await request("/requests", "POST", input("tickets-approvals"));
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await request("/calendar", "POST", input("calendar", { date }));
  const summary = (await request("/workspace/summary")).body;
  assert.equal(summary.totalTasks, 101);
  assert.equal(summary.completedTasks, 50);
  assert.equal(summary.overdueTasks, 51);
  assert.equal(summary.projects, 1);
  assert.equal(summary.pendingRequests, 1);
  assert.equal(summary.todayEvents, 1);
  assert.equal(summary.tasks.length, 8);
});
test("records survive a Nest restart; former legal routes no longer exist", async () => {
  const task = (await request("/tasks", "POST", input())).body;
  await app.close();
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  origin = await app.getUrl();
  assert.equal((await request("/tasks/" + task.id)).body.name, task.name);
  assert.equal((await request("/manage-information")).status, 404);
  assert.equal((await request("/teams")).status, 404);
  assert.equal((await request("/case-transfers", "POST", {})).status, 404);
});
test("task, comment, message and meeting events create notifications with navigation links", async () => {
  const recipient = "Lan";
  const inbox = () =>
    request(`/notifications?recipient=${encodeURIComponent(recipient)}`);
  const task = (
    await request("/tasks", "POST", input("tasks", { assignee: recipient }))
  ).body;
  let list = await waitFor(inbox, (result) => result.body.total >= 1);
  assert.equal(list.body.items[0].source, "task");
  assert.equal(list.body.items[0].sourceId, task.id);
  assert.equal(
    list.body.items[0].link,
    `/work-management/tasks?focus=${task.id}`,
  );
  assert.equal(list.body.unread, 1);

  // A manager move is the only status change that notifies the assignee.
  await transition(task, "Hoãn lại", { reason: "Khách hàng tạm dừng" });
  list = await waitFor(inbox, (result) =>
    result.body.items.some(
      (item) => item.source === "task" && item.body.includes("Hoãn lại"),
    ),
  );
  assert.ok(
    list.body.items.some(
      (item) => item.source === "task" && item.body.includes("Hoãn lại"),
    ),
  );

  const comment = await request("/task-comments", "POST", {
    taskId: task.id,
    body: "Đã xong phần API",
  });
  assert.equal(comment.status, 201, JSON.stringify(comment.body));
  list = await waitFor(inbox, (result) =>
    result.body.items.some(
      (item) =>
        item.source === "comment" && item.body.includes("Đã xong phần API"),
    ),
  );
  assert.ok(
    list.body.items.some(
      (item) =>
        item.source === "comment" &&
        item.body.includes(ADMIN.displayName) &&
        item.body.includes("Đã xong phần API"),
    ),
  );

  const thread = (
    await request(
      "/messages",
      "POST",
      input("internal-chat", {
        assignee: recipient,
        fields: { participants: "Lan, Minh" },
      }),
    )
  ).body;
  list = await waitFor(inbox, (result) => result.body.total >= 4);
  assert.ok(
    list.body.items.some(
      (item) => item.source === "message" && item.sourceId === thread.id,
    ),
  );

  const meeting = (
    await request(
      "/calendar",
      "POST",
      input("calendar", {
        assignee: recipient,
        fields: {
          kind: "Cuộc họp",
          startTime: "09:00",
          endTime: "10:00",
          attendees: "Lan, Minh",
        },
      }),
    )
  ).body;
  list = await waitFor(inbox, (result) => result.body.total >= 5);
  assert.ok(
    list.body.items.some(
      (item) => item.source === "meeting" && item.sourceId === meeting.id,
    ),
  );

  const notification = list.body.items[0];
  const read = await request(`/notifications/${notification.id}/read`, "PATCH");
  assert.equal(read.status, 200);
  assert.ok(read.body.readAt);
  assert.equal(
    (await request(`/notifications/${notification.id}/read`, "PATCH")).status,
    200,
  );
  const all = await request("/notifications/read-all", "PATCH", { recipient });
  assert.equal(all.status, 200);
  assert.equal(
    (
      await request(
        `/notifications?recipient=${encodeURIComponent(recipient)}&unread=true`,
      )
    ).body.total,
    0,
  );

  // Deleting the source task soft-deletes linked notifications (hidden from UI, preserved in DB)
  const taskNotification = list.body.items.find(
    (item) => item.sourceId === task.id,
  );
  assert.ok(taskNotification);
  const currentTask = (await request(`/tasks/${task.id}`)).body;
  const deleteTask = await request(`/tasks/${task.id}`, "DELETE", {
    version: currentTask.version,
  });
  assert.equal(deleteTask.status, 200);
  list = await waitFor(
    inbox,
    (result) => !result.body.items.some((item) => item.sourceId === task.id),
  );
  assert.equal(
    list.body.items.some((item) => item.sourceId === task.id),
    false,
  );

  // Verified: The notification record is retained in database for audit checks
  const archived = await request(`/notifications/${taskNotification.id}`);
  assert.equal(archived.status, 200);
  assert.ok(archived.body.deletedAt);

  // Direct DELETE /notifications/:id soft-deletes the notification
  const remainingNotif = list.body.items[0];
  if (remainingNotif) {
    const delNotif = await request(
      `/notifications/${remainingNotif.id}`,
      "DELETE",
    );
    assert.equal(delNotif.status, 200);
    assert.ok(delNotif.body.deletedAt);
    const afterDel = await request(
      `/notifications?recipient=${encodeURIComponent(recipient)}`,
    );
    assert.equal(
      afterDel.body.items.some((item) => item.id === remainingNotif.id),
      false,
    );

    // Verified: Retained in database with deletedAt timestamp
    const checked = await request(`/notifications/${remainingNotif.id}`);
    assert.equal(checked.status, 200);
    assert.ok(checked.body.deletedAt);
  }
});
test("notification stream pushes new notifications over SSE", async () => {
  const controller = new AbortController();
  const response = await fetch(
    `${origin}/api/v1/notifications/stream?recipient=Lan`,
    { signal: controller.signal, headers: { Cookie: cookie } },
  );
  assert.match(
    response.headers.get("content-type") ?? "",
    /text\/event-stream/,
  );
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const created = await request(
      "/tasks",
      "POST",
      input("tasks", { assignee: "Lan" }),
    );
    assert.equal(created.status, 201);
    let buffer = "";
    while (!buffer.includes("event: notification\n")) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    assert.match(buffer, /event: notification/);
    assert.match(buffer, new RegExp(created.body.id));

    // Deleting the task pushes notification_deleted over SSE
    await request(`/tasks/${created.body.id}`, "DELETE", {
      version: created.body.version,
    });
    while (!buffer.includes("event: notification_deleted")) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    assert.match(buffer, /event: notification_deleted/);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
});
test("tenant sessions sign in, slide, expire, change password and revoke", async () => {
  const account = await request("/accounts", "POST", {
    username: "Quan.Tri",
    displayName: "Trần Quản Trị",
    role: "MANAGER",
    isSystemAdmin: true,
    password: "mat-khau-01",
    actorName: "Hệ thống",
  });
  assert.equal(account.status, 201, JSON.stringify(account.body));
  const signIn = async (password) => {
    const response = await fetch(`${origin}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "quan.tri", password }),
    });
    return {
      status: response.status,
      body: await response.json(),
      cookie: (response.headers.get("set-cookie") ?? "").split(";")[0],
    };
  };
  const wrong = await signIn("sai-mat-khau");
  assert.equal(wrong.status, 401);
  assert.equal(wrong.cookie, "");
  const signed = await signIn("mat-khau-01");
  assert.equal(signed.status, 200, JSON.stringify(signed.body));
  assert.match(signed.cookie, /^oneops_session=/);
  assert.equal(signed.body.actor.username, "Quan.Tri");
  assert.equal(signed.body.actor.role, "MANAGER");
  assert.equal(signed.body.actor.isSystemAdmin, true);
  assert.equal(signed.body.actor.mustChangePassword, true);
  assert.equal(signed.body.idleMinutes, 30);
  const session = (cookie) =>
    fetch(`${origin}/api/v1/auth/session`, {
      headers: cookie ? { Cookie: cookie } : {},
    }).then(async (response) => ({
      status: response.status,
      body: await response.json(),
    }));
  assert.equal((await session("")).status, 401);
  assert.equal((await session("oneops_session=gia-mao")).status, 401);
  const resumed = await session(signed.cookie);
  assert.equal(resumed.status, 200, JSON.stringify(resumed.body));
  assert.equal(resumed.body.actor.accountId, account.body.id);
  const change = (cookie, body) =>
    fetch(`${origin}/api/v1/auth/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    }).then(async (response) => ({
      status: response.status,
      body: await response.json(),
    }));
  assert.equal(
    (
      await change(signed.cookie, {
        currentPassword: "sai-mat-khau",
        newPassword: "mat-khau-02",
      })
    ).status,
    422,
  );
  const changed = await change(signed.cookie, {
    currentPassword: "mat-khau-01",
    newPassword: "mat-khau-02",
  });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  assert.equal((await signIn("mat-khau-01")).status, 401);
  const next = await signIn("mat-khau-02");
  assert.equal(next.status, 200, JSON.stringify(next.body));
  assert.equal(next.body.actor.mustChangePassword, false);
  const signedOut = await fetch(`${origin}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Cookie: next.cookie },
  });
  assert.equal(signedOut.status, 200);
  assert.equal((await session(next.cookie)).status, 401);
  const third = await signIn("mat-khau-02");
  assert.equal(third.status, 200);
  const employee = await request("/accounts", "POST", {
    username: "nhan.vien",
    displayName: "Lê Nhân Viên",
    password: "mat-khau-03",
    actorName: "Hệ thống",
  });
  assert.equal(employee.status, 201, JSON.stringify(employee.body));
  const employeeSignIn = async () => {
    const response = await fetch(`${origin}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nhan.vien", password: "mat-khau-03" }),
    });
    return {
      status: response.status,
      cookie: (response.headers.get("set-cookie") ?? "").split(";")[0],
    };
  };
  const signedEmployee = await employeeSignIn();
  assert.equal(signedEmployee.status, 200);
  const locked = await request(`/accounts/${employee.body.id}/access`, "POST", {
    status: "LOCKED",
    lockedReason: "Tạm khóa để kiểm thử",
    actorName: "Kiểm thử",
    version: 1,
  });
  assert.equal(locked.status, 200, JSON.stringify(locked.body));
  assert.equal((await session(signedEmployee.cookie)).status, 401);
  assert.equal((await employeeSignIn()).status, 403);
  assert.equal((await session(third.cookie)).status, 200);
});
test("task workflow owns every legal move and rejects the rest", async () => {
  const rules = (await request("/task-workflow/rules")).body;
  assert.deepEqual(rules.terminal, ["Hoàn thành", "Đã hủy"]);
  assert.equal(
    rules.transitions.find((rule) => rule.code === "TR-02").actor,
    "ASSIGNEE",
  );
  assert.deepEqual(
    rules.transitions
      .filter((rule) => rule.reasonRequired)
      .map((rule) => rule.code),
    ["TR-05", "TR-06", "TR-08"],
  );

  const task = (await request("/tasks", "POST", input())).body;
  const state = (await request(`/task-workflow/tasks/${task.id}/state`)).body;
  assert.equal(state.task.status, "Cần làm");
  assert.deepEqual(
    state.allowed.map((move) => move.code),
    // A manager may start, hold, or cancel a fresh task.
    ["TR-02", "TR-06", "TR-08"],
  );
  assert.equal(state.pendingProposal, null);
  assert.deepEqual(state.history, []);
  assert.deepEqual(
    (await request(`/task-workflow/allowed?taskIds=${task.id}`)).body.items[0]
      .allowed,
    state.allowed,
  );

  // Skipping a step and moving without the mandatory reason are both refused.
  assert.equal(
    (
      await request(`/task-workflow/tasks/${task.id}/transitions`, "POST", {
        toStatus: "Hoàn thành",
        version: 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/task-workflow/tasks/${task.id}/transitions`, "POST", {
        toStatus: "Hoãn lại",
        version: 1,
      })
    ).status,
    422,
  );

  // Idempotency: the same key replays the move instead of recording twice.
  const key = "workflow:test:0001";
  const started = await request(
    `/task-workflow/tasks/${task.id}/transitions`,
    "POST",
    { toStatus: "Đang làm", version: 1 },
    { "Idempotency-Key": key },
  );
  assert.equal(started.status, 200, JSON.stringify(started.body));
  assert.equal(started.body.task.status, "Đang làm");
  const replay = await request(
    `/task-workflow/tasks/${task.id}/transitions`,
    "POST",
    { toStatus: "Đang làm", version: 1 },
    { "Idempotency-Key": key },
  );
  assert.equal(replay.status, 200, JSON.stringify(replay.body));
  assert.equal(replay.body.task.version, 2);
  assert.equal(
    (await request(`/task-workflow/tasks/${task.id}/history`)).body.items
      .length,
    1,
  );

  const review = await transition(started.body.task, "Chờ kiểm tra");
  const completed = await transition(review, "Hoàn thành");
  assert.equal(completed.status, "Hoàn thành");
  const terminal = (await request(`/task-workflow/tasks/${task.id}/state`))
    .body;
  assert.deepEqual(terminal.allowed, []);
  assert.deepEqual(
    terminal.history.map((row) => row.code),
    ["TR-02", "TR-03", "TR-04"],
  );
  assert.equal(
    (
      await request(`/task-workflow/tasks/${task.id}/transitions`, "POST", {
        toStatus: "Cần làm",
        version: completed.version,
      })
    ).status,
    409,
  );

  // A task assigned to someone else only accepts manager moves.
  const assigned = (
    await request(
      "/tasks",
      "POST",
      input("tasks", { code: "WORK-03", assignee: "Lan" }),
    )
  ).body;
  assert.equal(
    (
      await request(`/task-workflow/tasks/${assigned.id}/transitions`, "POST", {
        toStatus: "Đang làm",
        version: 1,
      })
    ).status,
    403,
  );

  // Holding remembers where the task came from so TR-07 can restore it.
  const held = (
    await request("/tasks", "POST", input("tasks", { code: "WORK-02" }))
  ).body;
  await transition(held, "Hoãn lại", { reason: "Chờ khách hàng phản hồi" });
  const afterHold = (await request(`/task-workflow/tasks/${held.id}/state`))
    .body;
  assert.equal(afterHold.task.status, "Hoãn lại");
  assert.equal(afterHold.restoreStatus, "Cần làm");
  assert.deepEqual(afterHold.allowed.map((move) => move.code).sort(), [
    "TR-07",
    "TR-08",
  ]);
  const restored = await transition(afterHold.task, "Cần làm");
  assert.equal(restored.status, "Cần làm");
});
test("task links reject cycles and gate the start of a blocked task", async () => {
  const create = async (code) =>
    (await request("/tasks", "POST", input("tasks", { code }))).body;
  const first = await create("WORK-20");
  const second = await create("WORK-21");
  const third = await create("WORK-22");

  // Self links and unknown tasks never reach the table.
  assert.equal(
    (
      await request("/task-links", "POST", {
        fromTaskId: first.id,
        toTaskId: first.id,
        type: "BLOCKS",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/task-links", "POST", {
        fromTaskId: first.id,
        toTaskId: "00000000-0000-4000-8000-000000000000",
        type: "BLOCKS",
      })
    ).status,
    404,
  );

  const link = await request("/task-links", "POST", {
    fromTaskId: first.id,
    toTaskId: second.id,
    type: "BLOCKS",
    note: "Chờ API xong trước",
  });
  assert.equal(link.status, 201, JSON.stringify(link.body));
  assert.equal(link.body.counterpart.code, "WORK-21");
  // The same pair is refused in both directions before the unique index fires.
  assert.equal(
    (
      await request("/task-links", "POST", {
        fromTaskId: first.id,
        toTaskId: second.id,
        type: "BLOCKS",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/task-links", "POST", {
        fromTaskId: second.id,
        toTaskId: first.id,
        type: "BLOCKS",
      })
    ).status,
    409,
  );

  // second blocks third, so third blocking first would close a cycle.
  assert.equal(
    (
      await request("/task-links", "POST", {
        fromTaskId: second.id,
        toTaskId: third.id,
        type: "BLOCKS",
      })
    ).status,
    201,
  );
  const cycle = await request("/task-links", "POST", {
    fromTaskId: third.id,
    toTaskId: first.id,
    type: "BLOCKS",
  });
  assert.equal(cycle.status, 409, JSON.stringify(cycle.body));
  assert.match(cycle.body.message, /vòng lặp/);

  // The board learns how many blockers are still open for each card.
  const chips = (
    await request(
      `/task-links/blockers?taskIds=${first.id},${second.id},${third.id}`,
    )
  ).body.items;
  assert.deepEqual(
    chips.map((item) => [item.taskId, item.total, item.open]),
    [
      [first.id, 0, 0],
      [second.id, 1, 1],
      [third.id, 1, 1],
    ],
  );

  // A blocked task cannot enter work, and the state explains why.
  const state = (await request(`/task-workflow/tasks/${second.id}/state`)).body;
  assert.deepEqual(
    state.allowed.find((move) => move.code === "TR-02"),
    { code: "TR-02", to: "Đang làm", blockedBy: 1 },
  );
  const refused = await request(
    `/task-workflow/tasks/${second.id}/transitions`,
    "POST",
    { toStatus: "Đang làm", version: 1 },
  );
  assert.equal(refused.status, 409, JSON.stringify(refused.body));
  assert.match(refused.body.message, /chặn/);

  // Finishing the blocker releases the successor.
  await completeTask(first);
  const [afterFirst] = (
    await request(`/task-links/blockers?taskIds=${second.id}`)
  ).body.items;
  assert.deepEqual([afterFirst.total, afterFirst.open], [1, 0]);
  await transition(second, "Đang làm");

  // A manager may still start a blocked task, and the reason is on the record.
  const forced = await request(
    `/task-workflow/tasks/${third.id}/transitions`,
    "POST",
    {
      toStatus: "Đang làm",
      version: 1,
      overrideReason: "Khách hàng chốt tiến độ, chấp nhận rủi ro",
    },
  );
  assert.equal(forced.status, 200, JSON.stringify(forced.body));
  const trail = (await request(`/task-comments?taskId=${third.id}`)).body.items;
  assert.ok(
    trail.some(
      (item) => item.kind === "SYSTEM" && item.body.startsWith("[TR-02] Khách"),
    ),
    JSON.stringify(trail),
  );

  // Removing a link clears the other end as well.
  assert.equal(
    (await request(`/task-links/${link.body.id}`, "DELETE")).status,
    200,
  );
  const afterDelete = (await request(`/task-links?taskId=${second.id}`)).body;
  assert.deepEqual(afterDelete.incoming, [], JSON.stringify(afterDelete));
  assert.deepEqual(
    afterDelete.outgoing.map((item) => item.counterpart.code),
    ["WORK-22"],
  );
});

test("proposals wait for another manager and then drive the task status", async () => {
  const task = (
    await request("/tasks", "POST", input("tasks", { code: "WORK-10" }))
  ).body;
  assert.equal(
    (
      await request(`/task-workflow/tasks/${task.id}/proposals`, "POST", {
        kind: "DEADLINE",
        reason: "Cần dời lịch bàn giao",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/task-workflow/tasks/${task.id}/proposals`, "POST", {
        kind: "HOLD",
        reason: "lý",
      })
    ).status,
    400,
  );
  const proposal = await request(
    `/task-workflow/tasks/${task.id}/proposals`,
    "POST",
    { kind: "HOLD", reason: "Chờ khách hàng phản hồi" },
  );
  assert.equal(proposal.status, 201, JSON.stringify(proposal.body));
  assert.equal(proposal.body.status, "PENDING");
  assert.equal(
    (
      await request(`/task-workflow/tasks/${task.id}/proposals`, "POST", {
        kind: "CANCEL",
        reason: "Một đề xuất khác đang chờ",
      })
    ).status,
    409,
  );

  const pending = (await request(`/task-workflow/tasks/${task.id}/state`)).body;
  assert.equal(pending.pendingProposal.id, proposal.body.id);
  assert.equal(
    (await request("/task-workflow/proposals?status=PENDING")).body.total,
    1,
  );
  // The requester cannot decide their own proposal.
  assert.equal(
    (
      await request(
        `/task-workflow/proposals/${proposal.body.id}/decision`,
        "POST",
        { decision: "APPROVE" },
      )
    ).status,
    403,
  );

  const deputy = await request("/accounts", "POST", {
    username: "pho.quan.ly",
    displayName: "Trần Phó Quản Lý",
    employeeCode: "EMP-02",
    role: "MANAGER",
    password: "mat-khau-07",
    actorName: "Hệ thống",
  });
  assert.equal(deputy.status, 201, JSON.stringify(deputy.body));
  const adminCookie = cookie;
  const deputySignIn = await signIn("pho.quan.ly", "mat-khau-07");
  assert.equal(deputySignIn.status, 200, JSON.stringify(deputySignIn.body));
  cookie = deputySignIn.cookie;

  assert.equal(
    (
      await request(
        `/task-workflow/proposals/${proposal.body.id}/decision`,
        "POST",
        { decision: "REJECT" },
      )
    ).status,
    400,
  );
  const rejected = await request(
    `/task-workflow/proposals/${proposal.body.id}/decision`,
    "POST",
    { decision: "REJECT", reason: "Chưa cần hoãn ở giai đoạn này" },
  );
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
  assert.equal(rejected.body.status, "REJECTED");
  assert.equal(rejected.body.decidedByName, "Trần Phó Quản Lý");
  assert.equal(
    (
      await request(
        `/task-workflow/proposals/${proposal.body.id}/decision`,
        "POST",
        { decision: "APPROVE" },
      )
    ).status,
    409,
  );

  // An approved proposal performs the move and stays APPROVED, not auto-closed.
  // The manager asks; the deputy answers, so nobody decides their own request.
  cookie = adminCookie;
  const cancel = await request(
    `/task-workflow/tasks/${task.id}/proposals`,
    "POST",
    { kind: "CANCEL", reason: "Khách hàng đã dừng dự án" },
  );
  assert.equal(cancel.status, 201, JSON.stringify(cancel.body));
  cookie = deputySignIn.cookie;
  const approved = await request(
    `/task-workflow/proposals/${cancel.body.id}/decision`,
    "POST",
    { decision: "APPROVE" },
  );
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.status, "APPROVED");
  assert.equal(approved.body.decidedByName, "Trần Phó Quản Lý");
  cookie = adminCookie;
  const after = (await request(`/task-workflow/tasks/${task.id}/state`)).body;
  assert.equal(after.task.status, "Đã hủy");
  assert.equal(after.history.at(-1).code, "TR-08");
  assert.equal(after.history.at(-1).reason, "Khách hàng đã dừng dự án");
  assert.equal(after.pendingProposal, null);
});
test("milestones link tasks and the QA gate blocks completion until criteria pass", async () => {
  const project = (await request("/projects", "POST", input("project-spaces")))
    .body;
  assert.equal(
    (
      await request("/milestones", "POST", {
        projectId: project.id,
        name: "Mốc bàn giao",
        targetDate: "2026-12-31",
        status: "COMPLETED",
      })
    ).status,
    400,
  );
  const milestone = await request("/milestones", "POST", {
    projectId: project.id,
    name: "Mốc bàn giao",
    description: "Bàn giao giai đoạn một",
    targetDate: "2026-12-31",
    status: "PLANNED",
  });
  assert.equal(milestone.status, 201, JSON.stringify(milestone.body));
  assert.equal(milestone.body.status, "PLANNED");
  assert.equal(milestone.body.itemCount, 0);
  assert.equal(
    (await request(`/milestones?projectId=${project.id}`)).body.total,
    1,
  );

  const task = (
    await request("/tasks", "POST", input("tasks", { name: "Bàn giao API" }))
  ).body;
  const linked = await request(
    `/milestones/${milestone.body.id}/items`,
    "POST",
    { taskIds: [task.id] },
  );
  assert.equal(linked.status, 201, JSON.stringify(linked.body));
  assert.equal(linked.body.itemCount, 1);
  assert.equal(linked.body.items[0].taskId, task.id);
  assert.equal(linked.body.completedCount, 0);
  assert.equal(
    (
      await request(`/milestones/${milestone.body.id}/items`, "POST", {
        taskIds: [crypto.randomUUID()],
      })
    ).status,
    422,
  );

  const inProgress = await request(
    `/milestones/${milestone.body.id}`,
    "PATCH",
    { status: "IN_PROGRESS", version: 1 },
  );
  assert.equal(inProgress.status, 200, JSON.stringify(inProgress.body));
  assert.equal(inProgress.body.status, "IN_PROGRESS");
  assert.equal(
    (
      await request(`/milestones/${milestone.body.id}`, "PATCH", {
        status: "PLANNED",
        version: 2,
      })
    ).status,
    409,
  );

  const criterion = await request("/acceptance", "POST", {
    taskId: task.id,
    title: "API trả 200",
    steps: "Gọi GET /api/v1/tasks",
    expected: "HTTP 200",
  });
  assert.equal(criterion.status, 201, JSON.stringify(criterion.body));
  assert.equal(criterion.body.mandatory, true);
  const gate = (await request(`/acceptance?taskId=${task.id}`)).body;
  assert.deepEqual(gate.gate, {
    required: true,
    passed: false,
    blocking: ["API trả 200"],
  });

  const started = await transition(task, "Đang làm");
  const review = await transition(started, "Chờ kiểm tra");
  const blocked = await request(
    `/task-workflow/tasks/${task.id}/transitions`,
    "POST",
    { toStatus: "Hoàn thành", version: review.version },
  );
  assert.equal(blocked.status, 422, JSON.stringify(blocked.body));
  assert.match(JSON.stringify(blocked.body), /API trả 200/);

  const result = await request(
    `/acceptance/${criterion.body.id}/results`,
    "POST",
    {
      outcome: "PASS",
      note: "Đã chạy Postman",
      evidence: [
        { label: "Ảnh chụp", url: "https://example.test/evidence.png" },
      ],
    },
  );
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.outcome, "PASS");
  assert.equal(result.body.testedByName, ADMIN.displayName);
  assert.equal(result.body.isOverride, true);
  assert.equal(
    (await request(`/acceptance/${criterion.body.id}/results`)).body.items
      .length,
    1,
  );
  assert.equal(
    (await request(`/acceptance?taskId=${task.id}`)).body.gate.passed,
    true,
  );

  const completed = await transition(review, "Hoàn thành");
  assert.equal(completed.status, "Hoàn thành");
  const progress = (await request(`/milestones/${milestone.body.id}`)).body;
  assert.equal(progress.completedCount, 1);

  const removed = await request(
    `/milestones/${milestone.body.id}/items/${task.id}`,
    "DELETE",
  );
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.equal(removed.body.itemCount, 0);
  assert.equal(
    (
      await request(
        `/milestones/${milestone.body.id}/items/${task.id}`,
        "DELETE",
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(`/acceptance/${criterion.body.id}`, "DELETE", {
        version: criterion.body.version,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(`/acceptance?taskId=${task.id}`)).body.gate.required,
    false,
  );
});
test("timesheets keep 15 minute steps and route approvals by threshold", async () => {
  const rules = (await request("/timesheets/rules")).body;
  assert.equal(rules.minuteStep, 15);
  assert.equal(rules.dayLimitMinutes, 720);
  assert.equal(rules.dayThresholdMinutes, 480);

  const period = (await request("/timesheets/periods", "POST", {})).body;
  assert.equal(period.status, "OPEN");
  assert.equal(period.employeeId, ADMIN.employeeCode);
  assert.deepEqual(period.entries, []);
  assert.equal(period.weekEnd > period.weekStart, true);
  assert.equal(
    (await request("/timesheets/periods", "POST", {})).body.id,
    period.id,
  );

  const entry = await request(
    `/timesheets/periods/${period.id}/entries`,
    "POST",
    {
      workDate: period.weekStart,
      minutes: 60,
      note: "Phân tích yêu cầu",
      billable: true,
    },
    { "Idempotency-Key": "timesheet:test:0001" },
  );
  assert.equal(entry.status, 201, JSON.stringify(entry.body));
  assert.equal(entry.body.totalMinutes, 60);
  assert.equal(entry.body.entries.length, 1);
  const replay = await request(
    `/timesheets/periods/${period.id}/entries`,
    "POST",
    { workDate: period.weekStart, minutes: 60, note: "Phân tích yêu cầu" },
    { "Idempotency-Key": "timesheet:test:0001" },
  );
  assert.equal(replay.status, 201);
  assert.equal(replay.body.entries.length, 1);
  assert.equal(
    (
      await request(`/timesheets/periods/${period.id}/entries`, "POST", {
        workDate: period.weekStart,
        minutes: 20,
      })
    ).status,
    422,
  );
  const nextDay = new Date(period.weekEnd + "T00:00:00.000Z");
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  assert.equal(
    (
      await request(`/timesheets/periods/${period.id}/entries`, "POST", {
        workDate: nextDay.toISOString().slice(0, 10),
        minutes: 60,
      })
    ).status,
    422,
  );

  const entryId = entry.body.entries[0].id;
  const patched = await request(
    `/timesheets/periods/${period.id}/entries/${entryId}`,
    "PATCH",
    { minutes: 90, version: 1 },
  );
  assert.equal(patched.status, 200, JSON.stringify(patched.body));
  assert.equal(patched.body.totalMinutes, 90);
  const submitted = await request(
    `/timesheets/periods/${period.id}/submit`,
    "POST",
  );
  assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
  assert.equal(submitted.body.status, "APPROVED");
  assert.equal(submitted.body.decidedByName, "Hệ thống");
  assert.equal(submitted.body.overThreshold, false);
  assert.equal(
    (
      await request(
        `/timesheets/periods/${period.id}/entries/${entryId}`,
        "PATCH",
        { minutes: 120, version: 2 },
      )
    ).status,
    409,
  );
  const adjusted = await request(
    `/timesheets/entries/${entryId}/adjustments`,
    "POST",
    { deltaMinutes: -15, note: "Trừ giờ nghỉ trưa" },
  );
  assert.equal(adjusted.status, 201, JSON.stringify(adjusted.body));
  assert.equal(adjusted.body.totalMinutes, 75);
  assert.equal(adjusted.body.adjustments.length, 1);
  assert.equal(
    (
      await request(`/timesheets/periods/${period.id}/decision`, "POST", {
        decision: "APPROVE",
      })
    ).status,
    409,
  );

  // Over-threshold weeks need a manager, and nobody approves their own sheet.
  const employee = await request("/accounts", "POST", {
    username: "nhan.vien.ts",
    displayName: "Lê Nhân Viên",
    employeeCode: "EMP-03",
    password: "mat-khau-08",
    actorName: "Hệ thống",
  });
  assert.equal(employee.status, 201, JSON.stringify(employee.body));
  const adminCookie = cookie;
  const employeeSignIn = await signIn("nhan.vien.ts", "mat-khau-08");
  assert.equal(employeeSignIn.status, 200, JSON.stringify(employeeSignIn.body));
  cookie = employeeSignIn.cookie;
  const own = (await request("/timesheets/periods", "POST", {})).body;
  assert.equal(own.employeeId, "EMP-03");
  assert.equal(
    (
      await request(`/timesheets/periods/${own.id}/entries`, "POST", {
        workDate: own.weekStart,
        minutes: 540,
      })
    ).status,
    422,
  );
  const longEntry = await request(
    `/timesheets/periods/${own.id}/entries`,
    "POST",
    { workDate: own.weekStart, minutes: 540, note: "Chạy kiểm thử hồi quy" },
  );
  assert.equal(longEntry.status, 201, JSON.stringify(longEntry.body));
  const sent = await request(`/timesheets/periods/${own.id}/submit`, "POST");
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body.status, "SUBMITTED");
  assert.equal(sent.body.overThreshold, true);
  assert.equal(
    (
      await request(`/timesheets/periods/${own.id}/decision`, "POST", {
        decision: "APPROVE",
      })
    ).status,
    403,
  );

  cookie = adminCookie;
  assert.equal(
    (
      await request(`/timesheets/periods/${own.id}/decision`, "POST", {
        decision: "REJECT",
      })
    ).status,
    422,
  );
  const rejected = await request(
    `/timesheets/periods/${own.id}/decision`,
    "POST",
    { decision: "REJECT", note: "Thiếu mô tả công việc cụ thể" },
  );
  assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
  assert.equal(rejected.body.status, "REJECTED");
  assert.equal(
    (await request("/timesheets/periods?employeeId=EMP-03")).body.total,
    1,
  );

  // A rejected period reopens for the employee, who resubmits for approval.
  cookie = employeeSignIn.cookie;
  const dayTwo = new Date(own.weekStart + "T00:00:00.000Z");
  dayTwo.setUTCDate(dayTwo.getUTCDate() + 1);
  const complement = await request(
    `/timesheets/periods/${own.id}/entries`,
    "POST",
    {
      workDate: dayTwo.toISOString().slice(0, 10),
      minutes: 120,
      note: "Bổ sung mô tả công việc",
    },
  );
  assert.equal(complement.status, 201, JSON.stringify(complement.body));
  const resubmitted = await request(
    `/timesheets/periods/${own.id}/submit`,
    "POST",
  );
  assert.equal(resubmitted.status, 200, JSON.stringify(resubmitted.body));
  assert.equal(resubmitted.body.status, "SUBMITTED");
  cookie = adminCookie;
  const approved = await request(
    `/timesheets/periods/${own.id}/decision`,
    "POST",
    { decision: "APPROVE", note: "Đã bổ sung đầy đủ" },
  );
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  assert.equal(approved.body.status, "APPROVED");
  assert.equal(approved.body.decidedByName, ADMIN.displayName);
  assert.equal(approved.body.totalMinutes, 660);
});
test("daily check-in, workforce board and explanations keep versioned records", async () => {
  const record = await request("/daily-checkin", "POST", {
    employeeId: "EMP-01",
    employeeName: ADMIN.displayName,
    workDate: "2026-11-02",
    checkIn: "08:00",
  });
  assert.equal(record.status, 201, JSON.stringify(record.body));
  assert.equal(record.body.status, "OPEN");
  assert.equal(record.body.version, 1);
  assert.equal(
    (
      await request("/daily-checkin", "POST", {
        employeeId: "EMP-01",
        employeeName: ADMIN.displayName,
        workDate: "2026-11-02",
        checkIn: "09:00",
      })
    ).status,
    409,
  );
  const completed = await request(`/daily-checkin/${record.body.id}`, "PATCH", {
    checkOut: "17:30",
    version: 1,
  });
  assert.equal(completed.status, 200, JSON.stringify(completed.body));
  assert.equal(completed.body.status, "COMPLETE");
  assert.equal(completed.body.version, 2);
  assert.equal(
    (
      await request(`/daily-checkin/${record.body.id}`, "PATCH", {
        note: "Ghi chú cũ",
        version: 1,
      })
    ).status,
    409,
  );
  const locked = await request(
    `/daily-checkin/${record.body.id}/lock`,
    "POST",
    {
      version: 2,
    },
  );
  assert.equal(locked.status, 200, JSON.stringify(locked.body));
  assert.equal(locked.body.status, "LOCKED");
  assert.equal(
    (
      await request(`/daily-checkin/${record.body.id}`, "PATCH", {
        note: "Sửa sau khi chốt",
        version: 3,
      })
    ).status,
    409,
  );

  const presence = await request("/workforce-board", "POST", {
    employeeId: "EMP-01",
    employeeName: ADMIN.displayName,
    workDate: "2026-11-02",
    status: "REMOTE",
    shiftLabel: "Ca hành chính",
  });
  assert.equal(presence.status, 201, JSON.stringify(presence.body));
  assert.equal(
    (
      await request("/workforce-board", "POST", {
        employeeId: "EMP-01",
        employeeName: ADMIN.displayName,
        workDate: "2026-11-02",
      })
    ).status,
    409,
  );
  const summary = await request("/workforce-board/summary?workDate=2026-11-02");
  assert.equal(summary.status, 200, JSON.stringify(summary.body));
  assert.equal(summary.body.total, 1);
  assert.deepEqual(summary.body.items, [{ status: "REMOTE", count: 1 }]);

  const shortReason = await request("/checkin-explanations", "POST", {
    employeeId: "EMP-01",
    employeeName: ADMIN.displayName,
    workDate: "2026-11-02",
    reason: "quên",
  });
  assert.equal(shortReason.status, 400);
  const explanation = await request("/checkin-explanations", "POST", {
    employeeId: "EMP-01",
    employeeName: ADMIN.displayName,
    workDate: "2026-11-02",
    type: "MISSED_CHECKOUT",
    reason: "Máy chấm công mất kết nối buổi chiều",
  });
  assert.equal(explanation.status, 201, JSON.stringify(explanation.body));
  assert.equal(explanation.body.status, "PENDING");
  assert.equal(
    (
      await request("/checkin-explanations", "POST", {
        employeeId: "EMP-01",
        employeeName: ADMIN.displayName,
        workDate: "2026-11-02",
        type: "MISSED_CHECKOUT",
        reason: "Gửi trùng đơn giải trình buổi chiều",
      })
    ).status,
    409,
  );
  const decided = await request(
    `/checkin-explanations/${explanation.body.id}/decision`,
    "POST",
    { status: "APPROVED", note: "Đã đối chiếu camera", version: 1 },
  );
  assert.equal(decided.status, 200, JSON.stringify(decided.body));
  assert.equal(decided.body.status, "APPROVED");
  assert.equal(decided.body.decidedBy, ADMIN.displayName);
  assert.equal(
    (
      await request(
        `/checkin-explanations/${explanation.body.id}/decision`,
        "POST",
        {
          status: "REJECTED",
          version: 2,
        },
      )
    ).status,
    409,
  );
});
test("shift templates, weekly patterns and bulk assignments build the schedule", async () => {
  const shift = await request("/shifts-schedules/shifts", "POST", {
    name: "Ca hành chính",
    startTime: "08:00",
    endTime: "17:00",
    breakMinutes: 60,
    effectiveFrom: "2026-11-02",
  });
  assert.equal(shift.status, 201, JSON.stringify(shift.body));
  assert.equal(shift.body.status, "ACTIVE");
  assert.equal(shift.body.hours, 8);
  assert.equal(shift.body.assignmentCount, 0);

  const pattern = await request("/shifts-schedules/patterns", "POST", {
    name: "Tuần chuẩn thứ hai",
    slots: [{ weekday: 1, shiftId: shift.body.id }],
  });
  assert.equal(pattern.status, 201, JSON.stringify(pattern.body));
  const applied = await request(
    `/shifts-schedules/patterns/${pattern.body.id}/apply`,
    "POST",
    {
      from: "2026-11-02",
      to: "2026-11-08",
      employees: [{ id: "EMP-01", name: ADMIN.displayName }],
    },
  );
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.equal(applied.body.created, 1);
  assert.equal(applied.body.total, 1);
  const assignments = await request(
    "/shifts-schedules/assignments?employeeId=EMP-01",
  );
  assert.equal(assignments.body.total, 1);
  assert.equal(assignments.body.items[0].source, "PATTERN");
  assert.equal(assignments.body.items[0].workDate, "2026-11-02");
  assert.equal(
    (
      await request(`/shifts-schedules/shifts/${shift.body.id}`, "PATCH", {
        startTime: "07:30",
        version: 1,
      })
    ).status,
    409,
  );
  const bulk = await request("/shifts-schedules/assignments/bulk", "POST", {
    shiftId: shift.body.id,
    from: "2026-11-09",
    to: "2026-11-13",
    weekdays: [1, 3, 5],
    employees: [{ id: "EMP-01", name: ADMIN.displayName }],
  });
  assert.equal(bulk.status, 200, JSON.stringify(bulk.body));
  assert.equal(bulk.body.total, 3);
  assert.equal(
    (await request("/shifts-schedules/assignments?employeeId=EMP-01")).body
      .total,
    4,
  );
});
test("attendance report periods aggregate lines and close against edits", async () => {
  const period = await request("/attendance-reports/periods", "POST", {
    periodKey: "2026-11",
    name: "Công tháng 11/2026",
    fromDate: "2026-11-01",
    toDate: "2026-11-30",
  });
  assert.equal(period.status, 201, JSON.stringify(period.body));
  assert.equal(period.body.status, "DRAFT");
  assert.equal(period.body.lineCount, 0);
  assert.equal(
    (
      await request("/attendance-reports/periods", "POST", {
        periodKey: "2026-11",
        name: "Kỳ trùng tháng",
        fromDate: "2026-11-01",
        toDate: "2026-11-30",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/attendance-reports/periods", "POST", {
        periodKey: "2026-12",
        name: "Kỳ lệch tháng",
        fromDate: "2026-11-01",
        toDate: "2026-11-30",
      })
    ).status,
    422,
  );
  const line = await request("/attendance-reports/lines", "POST", {
    periodId: period.body.id,
    employeeId: "EMP-01",
    employeeName: ADMIN.displayName,
    workedDays: 20,
    paidLeaveDays: 2,
    overtimeHours: 6,
  });
  assert.equal(line.status, 201, JSON.stringify(line.body));
  assert.equal(
    (
      await request("/attendance-reports/lines", "POST", {
        periodId: period.body.id,
        employeeId: "EMP-01",
        employeeName: ADMIN.displayName,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/attendance-reports/lines", "POST", {
        periodId: period.body.id,
        employeeId: "EMP-02",
        employeeName: "Nguyễn Hai",
        workedDays: 20,
        paidLeaveDays: 10,
        unpaidLeaveDays: 10,
      })
    ).status,
    422,
  );
  const totals = await request(
    `/attendance-reports/periods/${period.body.id}/summary`,
  );
  assert.equal(totals.status, 200, JSON.stringify(totals.body));
  assert.deepEqual(totals.body, {
    periodId: period.body.id,
    headcount: 1,
    workedDays: 20,
    paidLeaveDays: 2,
    unpaidLeaveDays: 0,
    overtimeHours: 6,
  });
  const closed = await request(
    `/attendance-reports/periods/${period.body.id}`,
    "PATCH",
    { status: "CLOSED", version: 1 },
  );
  assert.equal(closed.status, 200, JSON.stringify(closed.body));
  assert.equal(closed.body.status, "CLOSED");
  assert.equal(
    (
      await request("/attendance-reports/lines", "POST", {
        periodId: period.body.id,
        employeeId: "EMP-02",
        employeeName: "Nguyễn Hai",
      })
    ).status,
    409,
  );
});
test("payment requests run an ordered approval chain the workflow owns", async () => {
  const created = await request(
    "/requests",
    "POST",
    input("tickets-approvals", {
      name: "Thanh toán hoá đơn vận chuyển",
      assignee: "Nguyễn Đề Xuất",
      fields: {
        category: "Thanh toán",
        amount: 25000000,
        requester: "Nguyễn Đề Xuất",
      },
    }),
  );
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, "Chờ duyệt");

  const chain = await request(`/requests/${created.body.id}/approval`);
  assert.equal(chain.status, 200, JSON.stringify(chain.body));
  assert.deepEqual(
    chain.body.steps.map((step) => step.name),
    ["Quản lý trực tiếp", "Kiểm soát tài chính"],
  );
  assert.deepEqual(
    chain.body.steps.map((step) => step.status),
    ["PENDING", "WAITING"],
  );
  assert.equal(chain.body.steps[0].slaHours, 8);
  assert.equal(chain.body.steps[0].sla, "ON_TRACK");
  assert.equal(chain.body.canDecide, true);
  assert.equal(chain.body.canManage, true);

  assert.equal(
    (
      await request(`/requests/${created.body.id}`, "PATCH", {
        version: created.body.version,
        status: "Đã duyệt",
      })
    ).status,
    409,
  );

  const inbox = await request("/requests/inbox");
  assert.equal(inbox.status, 200, JSON.stringify(inbox.body));
  assert.ok(
    inbox.body.items.some((item) => item.request.id === created.body.id),
  );

  const first = await request(`/requests/${created.body.id}/decision`, "POST", {
    decision: "APPROVE",
    note: "Đồng ý chi",
    version: created.body.version,
  });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.request.status, "Chờ duyệt");
  assert.deepEqual(
    first.body.chain.steps.map((step) => step.status),
    ["APPROVED", "PENDING"],
  );
  assert.equal(first.body.chain.canDecide, true);

  assert.equal(
    (
      await request(`/requests/${created.body.id}/decision`, "POST", {
        decision: "REJECT",
        note: "",
        version: first.body.request.version,
      })
    ).status,
    422,
  );

  const second = await request(
    `/requests/${created.body.id}/decision`,
    "POST",
    { decision: "APPROVE", note: "", version: first.body.request.version },
  );
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.equal(second.body.request.status, "Đã duyệt");
  assert.equal(second.body.chain.activeStepId, null);

  assert.equal(
    (
      await request(`/requests/${created.body.id}`, "PATCH", {
        version: second.body.request.version,
        name: "Đổi tên sau khi duyệt",
      })
    ).status,
    409,
  );
});

test("approval SLAs escalate once and only assigned people decide", async () => {
  const created = await request(
    "/requests",
    "POST",
    input("tickets-approvals", {
      code: "REQ-MUA-01",
      name: "Mua 20 màn hình",
      assignee: "Nguyễn Đề Xuất",
      fields: {
        category: "Mua sắm",
        amount: 40000000,
        requester: "Nguyễn Đề Xuất",
      },
    }),
  );
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const chain = (await request(`/requests/${created.body.id}/approval`)).body;
  assert.deepEqual(
    chain.steps.map((step) => step.name),
    ["Quản lý trực tiếp", "Ban mua sắm"],
  );

  const moved = await request(`/requests/${created.body.id}/reassign`, "POST", {
    approvers: ["Trần Duyệt"],
    quorum: "ALL",
    note: "Nhờ duyệt giúp",
    version: created.body.version,
  });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal(moved.body.chain.canDecide, false);
  assert.equal(
    moved.body.chain.steps[0].approvers[0].displayName,
    "Trần Duyệt",
  );
  assert.match(moved.body.chain.steps[0].note, /Giao lại/);
  assert.equal(
    (
      await request(`/requests/${created.body.id}/decision`, "POST", {
        decision: "APPROVE",
        note: "",
        version: moved.body.request.version,
      })
    ).status,
    403,
  );

  // Push the gate far into the past so the deadline is unambiguous even when the
  // database clock and the API process clock drift apart.
  const elapsed = await runSql(
    `UPDATE "work_requests"."request_approval_steps"
        SET "dueAt" = $2
      WHERE "requestId" = $1 AND status = 'PENDING'`,
    [created.body.id, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()],
  );
  assert.equal(elapsed.rowCount, 1);
  const overdue = (await request(`/requests/${created.body.id}/approval`)).body;
  assert.equal(overdue.steps[0].sla, "OVERDUE");
  assert.ok(overdue.steps[0].escalatedAt);
  assert.match(overdue.steps[0].note, /Quá hạn/);
  const again = (await request(`/requests/${created.body.id}/approval`)).body;
  assert.equal(again.steps[0].escalatedAt, overdue.steps[0].escalatedAt);

  const selfDecided = await request(
    `/requests/${created.body.id}/reassign`,
    "POST",
    {
      approvers: [ADMIN.displayName],
      quorum: "ANY",
      version: moved.body.request.version,
    },
  );
  assert.equal(selfDecided.status, 200, JSON.stringify(selfDecided.body));
  assert.equal(selfDecided.body.chain.canDecide, true);

  const cancelled = await request(
    `/requests/${created.body.id}/cancel`,
    "POST",
    { reason: "Không còn nhu cầu", version: selfDecided.body.request.version },
  );
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal(cancelled.body.request.status, "Đã hủy");
  assert.match(cancelled.body.request.note, /Không còn nhu cầu/);
  assert.equal(
    cancelled.body.chain.steps.every((step) => step.status !== "PENDING"),
    true,
  );

  const own = await request(
    "/requests",
    "POST",
    input("tickets-approvals", {
      code: "REQ-OWN-01",
      name: "Tự duyệt",
      assignee: ADMIN.displayName,
      fields: { category: "Khác", requester: ADMIN.displayName },
    }),
  );
  assert.equal(own.status, 201, JSON.stringify(own.body));
  const ownChain = (await request(`/requests/${own.body.id}/approval`)).body;
  assert.equal(ownChain.canDecide, false);
  assert.equal(
    (
      await request(`/requests/${own.body.id}/decision`, "POST", {
        decision: "APPROVE",
        note: "",
        version: own.body.version,
      })
    ).status,
    403,
  );
});

test("leave requests feed approval history and the capacity workload", async () => {
  const requestBody = {
    employeeId: "EMP-01",
    employeeName: ADMIN.displayName,
    fromDate: "2026-11-09",
    toDate: "2026-11-11",
    reason: "Nghỉ phép năm cho việc gia đình",
  };
  const leave = await request("/leave-requests", "POST", requestBody);
  assert.equal(leave.status, 201, JSON.stringify(leave.body));
  assert.equal(leave.body.status, "PENDING");
  assert.equal(leave.body.days, 3);
  assert.equal(
    (
      await request("/leave-requests", "POST", {
        ...requestBody,
        fromDate: "2026-11-07",
        toDate: "2026-11-08",
      })
    ).status,
    422,
  );
  const queue = await request("/leaves/workflow/queue");
  assert.equal(queue.status, 200, JSON.stringify(queue.body));
  assert.equal(queue.body.length, 1);
  assert.equal(queue.body[0].id, leave.body.id);

  const employee = await request("/accounts", "POST", {
    username: "nhan.vien.phep",
    displayName: "Lê Nhân Viên",
    employeeCode: "EMP-06",
    actorName: "Hệ thống",
    password: "mat-khau-09",
  });
  assert.equal(employee.status, 201, JSON.stringify(employee.body));
  const adminCookie = cookie;
  const employeeSignIn = await signIn("nhan.vien.phep", "mat-khau-09");
  assert.equal(employeeSignIn.status, 200, JSON.stringify(employeeSignIn.body));
  cookie = employeeSignIn.cookie;
  assert.equal(
    (
      await request(
        `/leaves/workflow/queue/${leave.body.id}/decision`,
        "POST",
        {
          status: "APPROVED",
        },
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("/leave-requests", "POST", requestBody)).status,
    403,
  );
  cookie = adminCookie;

  const decision = await request(
    `/leaves/workflow/queue/${leave.body.id}/decision`,
    "POST",
    { status: "APPROVED", note: "Đồng ý, bàn giao đủ việc" },
  );
  assert.equal(decision.status, 200, JSON.stringify(decision.body));
  assert.equal(decision.body.request.status, "APPROVED");
  assert.equal(decision.body.request.decidedBy, ADMIN.displayName);
  assert.equal(decision.body.decision.status, "APPROVED");
  assert.equal(decision.body.decision.requestId, leave.body.id);
  assert.equal((await request("/leaves/workflow/queue")).body.length, 0);
  const history = await request("/leave-approvals");
  assert.equal(history.status, 200, JSON.stringify(history.body));
  assert.equal(history.body.total, 1);
  assert.equal(history.body.items[0].status, "APPROVED");
  assert.equal(history.body.items[0].decidedBy, ADMIN.displayName);
  assert.equal(
    (
      await request(
        `/leaves/workflow/queue/${leave.body.id}/decision`,
        "POST",
        {
          status: "REJECTED",
        },
      )
    ).status,
    409,
  );

  const period = await request("/resource-capacity/periods", "POST", {
    employeeId: "EMP-01",
    employeeName: ADMIN.displayName,
    fromDate: "2026-11-02",
    toDate: "2026-11-13",
  });
  assert.equal(period.status, 201, JSON.stringify(period.body));
  assert.equal(period.body.workingDays, 10);
  assert.equal(period.body.leaveDays, 0);
  const allocation = await request("/resource-capacity/allocations", "POST", {
    periodId: period.body.id,
    projectRef: "OneOps",
    percentage: 100,
  });
  assert.equal(allocation.status, 201, JSON.stringify(allocation.body));
  assert.equal(allocation.body.employeeId, "EMP-01");

  const workload = await request(`/workload/capacity/${period.body.id}`);
  assert.equal(workload.status, 200, JSON.stringify(workload.body));
  assert.equal(workload.body.summary.workingDays, 10);
  assert.equal(workload.body.summary.leaveDays, 3);
  assert.equal(workload.body.summary.availableHours, 56);
  assert.equal(workload.body.summary.allocatedPercent, 100);
  assert.equal(workload.body.summary.allocatedHours, 56);
  assert.equal(workload.body.summary.remainingHours, 0);
  assert.equal(workload.body.summary.overCapacity, false);

  const manual = await request(
    `/resource-capacity/periods/${period.body.id}/summary`,
  );
  assert.equal(manual.status, 200, JSON.stringify(manual.body));
  assert.equal(manual.body.summary.leaveDays, 0);
  assert.equal(manual.body.summary.availableHours, 80);

  const extra = await request("/resource-capacity/allocations", "POST", {
    periodId: period.body.id,
    projectRef: "Nội bộ",
    percentage: 60,
  });
  assert.equal(extra.status, 201, JSON.stringify(extra.body));
  const overloaded = await request(`/workload/capacity/${period.body.id}`);
  assert.equal(overloaded.body.summary.allocatedPercent, 160);
  assert.equal(overloaded.body.summary.remainingHours, -33.6);
  assert.equal(overloaded.body.summary.overCapacity, true);
  const cancelled = await request(
    `/resource-capacity/allocations/${extra.body.id}/cancel`,
    "POST",
    { version: 1 },
  );
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal(cancelled.body.status, "CANCELLED");
  assert.equal(
    (await request(`/workload/capacity/${period.body.id}`)).body.summary
      .allocatedPercent,
    100,
  );
});

test("sprint planning ranks the backlog and gates the commitment against capacity", async () => {
  const project = (await request("/projects", "POST", input("project-spaces")))
    .body;
  const points = [5, 8, 3];
  const tasks = [];
  for (const [index, value] of points.entries()) {
    const task = (
      await request(
        "/tasks",
        "POST",
        input("tasks", {
          code: "SPRINT-" + index,
          name: "Việc sprint " + index,
        }),
      )
    ).body;
    tasks.push(task);
    const added = await request(`/projects/${project.id}/items`, "POST", {
      taskId: task.id,
      points: value,
    });
    assert.equal(added.status, 201, JSON.stringify(added.body));
    assert.equal(added.body.task.code, task.code);
  }
  assert.equal(
    (
      await request(`/projects/${project.id}/items`, "POST", {
        taskId: tasks[0].id,
        points: 1,
      })
    ).status,
    409,
  );

  let board = (await request(`/projects/${project.id}/board`)).body;
  assert.deepEqual(
    board.backlog.map((item) => item.points),
    points,
  );
  // Everything already planned leaves the planning picker.
  assert.deepEqual(board.candidates, []);

  const third = board.backlog[2];
  const reordered = await request(
    `/projects/${project.id}/items/${third.id}/move`,
    "POST",
    { sprintId: null, index: 0, version: third.version },
  );
  assert.equal(reordered.status, 201, JSON.stringify(reordered.body));
  assert.deepEqual(
    reordered.body.backlog.map((item) => item.points),
    [3, 5, 8],
  );

  const sprint = (
    await request(`/projects/${project.id}/sprints`, "POST", {
      name: "Sprint 1",
      goal: "Ra mắt bản beta",
      startDate: "2026-11-02",
      endDate: "2026-11-13",
      capacity: 14,
    })
  ).body;
  assert.equal(sprint.status, "PLANNED");
  assert.equal(sprint.commitment.state, "EMPTY");
  assert.equal(
    (
      await request(`/projects/${project.id}/sprints`, "POST", {
        name: "Sprint 1",
        startDate: "2026-11-02",
        endDate: "2026-11-13",
      })
    ).status,
    409,
  );

  for (const [index, item] of reordered.body.backlog.entries()) {
    const moved = await request(
      `/projects/${project.id}/items/${item.id}/move`,
      "POST",
      { sprintId: sprint.id, index, version: item.version },
    );
    assert.equal(moved.status, 201, JSON.stringify(moved.body));
  }
  board = (await request(`/projects/${project.id}/board`)).body;
  const planned = board.sprints[0];
  assert.equal(planned.plannedPoints, 16);
  assert.equal(planned.commitment.capacity, 14);
  assert.equal(planned.commitment.overBy, 2);
  assert.equal(planned.commitment.state, "OVER");
  assert.deepEqual(board.backlog, []);

  // Above capacity needs the manager's explicit confirmation.
  assert.equal(
    (
      await request(
        `/projects/${project.id}/sprints/${sprint.id}/activate`,
        "POST",
        {
          version: planned.version,
        },
      )
    ).status,
    422,
  );
  const active = await request(
    `/projects/${project.id}/sprints/${sprint.id}/activate`,
    "POST",
    { version: planned.version, overCapacity: true },
  );
  assert.equal(active.status, 201, JSON.stringify(active.body));
  assert.equal(active.body.status, "ACTIVE");
  assert.equal(active.body.committed, 16);
  assert.ok(active.body.activatedAt);

  // An empty sprint cannot start, and only one sprint runs at a time.
  const second = (
    await request(`/projects/${project.id}/sprints`, "POST", {
      name: "Sprint 2",
      startDate: "2026-11-16",
      endDate: "2026-11-27",
      capacity: 20,
    })
  ).body;
  assert.equal(
    (
      await request(
        `/projects/${project.id}/sprints/${second.id}/activate`,
        "POST",
        {
          version: second.version,
        },
      )
    ).status,
    422,
  );

  // Planning keeps moving while a sprint runs, but starting a second one waits.
  board = (await request(`/projects/${project.id}/board`)).body;
  const running = board.sprints.find((item) => item.id === sprint.id);
  assert.equal(running.items.length, 3);
  assert.equal(running.doneCount, 0);
  const parked = running.items[0];
  const sent = await request(
    `/projects/${project.id}/items/${parked.id}/move`,
    "POST",
    { sprintId: second.id, index: 0, version: parked.version },
  );
  assert.equal(sent.status, 201, JSON.stringify(sent.body));
  assert.equal(
    (
      await request(
        `/projects/${project.id}/sprints/${second.id}/activate`,
        "POST",
        {
          version: second.version,
        },
      )
    ).status,
    409,
  );

  const waiting = sent.body.sprints.find((item) => item.id === second.id);
  assert.equal(waiting.plannedPoints, parked.points);
  const back = await request(
    `/projects/${project.id}/items/${waiting.items[0].id}/move`,
    "POST",
    {
      sprintId: sprint.id,
      index: 0,
      version: waiting.items[0].version,
    },
  );
  assert.equal(back.status, 201, JSON.stringify(back.body));
  const restored = back.body.sprints.find((item) => item.id === sprint.id);
  assert.equal(restored.plannedPoints, 16);
  assert.equal(restored.committedOnPlan, true);
});

test("closing a sprint carries unfinished work forward and records velocity", async () => {
  const project = (await request("/projects", "POST", input("project-spaces")))
    .body;
  const points = [5, 8, 3];
  const tasks = [];
  const items = [];
  for (const [index, value] of points.entries()) {
    const task = (
      await request(
        "/tasks",
        "POST",
        input("tasks", {
          code: "CARRY-" + index,
          name: "Việc chuyển tiếp " + index,
        }),
      )
    ).body;
    tasks.push(task);
    items.push(
      (
        await request(`/projects/${project.id}/items`, "POST", {
          taskId: task.id,
          points: value,
        })
      ).body,
    );
  }
  const sprint = (
    await request(`/projects/${project.id}/sprints`, "POST", {
      name: "Sprint 1",
      startDate: "2026-11-02",
      endDate: "2026-11-13",
      capacity: 20,
    })
  ).body;
  for (const [index, item] of items.entries()) {
    const moved = await request(
      `/projects/${project.id}/items/${item.id}/move`,
      "POST",
      { sprintId: sprint.id, index, version: item.version },
    );
    assert.equal(moved.status, 201, JSON.stringify(moved.body));
  }
  let board = (await request(`/projects/${project.id}/board`)).body;
  const planned = board.sprints.find((item) => item.id === sprint.id);
  const started = await request(
    `/projects/${project.id}/sprints/${sprint.id}/activate`,
    "POST",
    { version: planned.version },
  );
  assert.equal(started.status, 201, JSON.stringify(started.body));
  assert.equal(started.body.committed, 16);

  await completeTask(tasks[0]);
  await completeTask(tasks[1]);
  board = (await request(`/projects/${project.id}/board`)).body;
  const running = board.sprints.find((item) => item.id === sprint.id);
  assert.equal(running.doneCount, 2);
  assert.equal(running.donePoints, 13);
  assert.equal(running.remainingPoints, 3);

  const next = (
    await request(`/projects/${project.id}/sprints`, "POST", {
      name: "Sprint 2",
      startDate: "2026-11-16",
      endDate: "2026-11-27",
      capacity: 20,
    })
  ).body;
  const closed = await request(
    `/projects/${project.id}/sprints/${sprint.id}/close`,
    "POST",
    { version: running.version, nextSprintId: next.id },
  );
  assert.equal(closed.status, 201, JSON.stringify(closed.body));
  const snapshot = closed.body.sprints.find((item) => item.id === sprint.id);
  assert.equal(snapshot.status, "CLOSED");
  assert.equal(snapshot.completed, 13);
  assert.equal(snapshot.carried, 3);
  assert.match(snapshot.note, /Đóng sprint/);
  const upcoming = closed.body.sprints.find((item) => item.id === next.id);
  assert.equal(upcoming.plannedPoints, 3);

  const metrics = (await request(`/projects/${project.id}/metrics`)).body;
  assert.equal(metrics.velocity.length, 1);
  assert.equal(metrics.velocity[0].completed, 13);
  assert.equal(metrics.velocity[0].carried, 3);
  assert.equal(metrics.averageVelocity, 13);
  assert.equal(metrics.active, null);

  // A closed sprint is history: no new rows, no edits, no deletes.
  const done = snapshot.items[0];
  assert.equal(
    (
      await request(`/projects/${project.id}/items/${done.id}/move`, "POST", {
        sprintId: upcoming.id,
        index: 0,
        version: done.version,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/projects/${project.id}/items/${done.id}`, "PATCH", {
        points: 9,
        version: done.version,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/projects/${project.id}/sprints/${sprint.id}`, "PATCH", {
        note: "Sửa sau khi đóng",
        version: snapshot.version,
      })
    ).status,
    409,
  );
});
test("automation rules match task changes, dry run first and log every run", async () => {
  const runsOf = async (ruleId) =>
    (await request(`/automation/runs?ruleId=${ruleId}`)).body.items;

  const created = await request("/automation/rules", "POST", {
    name: "Chuyển kiểm tra tự động",
    description: "Giao người kiểm tra ngay khi công việc sang Chờ kiểm tra",
    trigger: "updated",
    condition: [
      { field: "status", operator: "changedTo", value: "Chờ kiểm tra" },
    ],
    actions: [
      { kind: "comment", body: "Công việc {{code}} đã sẵn sàng kiểm tra." },
      { kind: "assign", assignee: "bao.tran" },
      {
        kind: "notify",
        recipients: "{{assignee}}, quan.ly",
        title: "Cần kiểm tra {{code}}",
        body: "{{name}} vừa chuyển sang Chờ kiểm tra.",
      },
    ],
    lockSeconds: 5,
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const rule = created.body;
  assert.equal(rule.version, 1);
  assert.equal(rule.condition.length, 1);
  assert.equal(rule.runCount, 0);

  // A rule that reacts to the assignee the automation itself sets must not
  // fire from the automation's own write: the applied rule locks the task.
  const chained = (
    await request("/automation/rules", "POST", {
      name: "Theo dõi người được giao",
      condition: [
        { field: "assignee", operator: "changedTo", value: "bao.tran" },
      ],
      actions: [{ kind: "comment", body: "Đã giao cho {{assignee}}." }],
      position: 20,
      lockSeconds: 5,
    })
  ).body;

  // Names stay unique and a stale version never overwrites a newer rule.
  assert.equal(
    (
      await request("/automation/rules", "POST", {
        name: "Chuyển kiểm tra tự động",
        actions: [{ kind: "status", status: "Đang làm" }],
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/automation/rules/${rule.id}`, "PATCH", {
        position: 30,
        version: 9,
      })
    ).status,
    409,
  );

  // The dry run compiles the actions for a made up snapshot without writing.
  const dry = await request("/automation/simulate", "POST", {
    trigger: "updated",
    values: {
      code: "CV-104",
      name: "Hoàn thiện báo giá",
      status: "Chờ kiểm tra",
      assignee: "lan.nguyen",
      reviewer: "",
      scope: "Nội bộ",
      date: "",
    },
    changed: ["status"],
  });
  assert.equal(dry.status, 200, JSON.stringify(dry.body));
  assert.equal(dry.body.matched, 1);
  const preview = dry.body.results.find((item) => item.ruleId === rule.id);
  assert.equal(preview.matched, true);
  assert.deepEqual(preview.actions, [
    { kind: "comment", body: "Công việc CV-104 đã sẵn sàng kiểm tra." },
    { kind: "assign", assignee: "bao.tran" },
    {
      kind: "notify",
      recipients: ["lan.nguyen", "quan.ly"],
      title: "Cần kiểm tra CV-104",
      body: "Hoàn thiện báo giá vừa chuyển sang Chờ kiểm tra.",
    },
  ]);
  // A field that did not change cannot satisfy `changedTo`.
  const untouched = await request("/automation/simulate", "POST", {
    trigger: "updated",
    values: { status: "Chờ kiểm tra", assignee: "lan.nguyen" },
  });
  assert.equal(untouched.body.matched, 0);
  assert.equal((await request("/automation/runs")).body.items.length, 0);

  // A real transition publishes the snapshot the engine evaluates. Nobody owns
  // the task yet, so the manager may act on it like the assignee would.
  const task = (
    await request("/tasks", "POST", input("tasks", { code: "AUTO-01" }))
  ).body;
  const started = await transition(task, "Đang làm");
  await transition(started, "Chờ kiểm tra");

  const [run] = await waitFor(
    () => runsOf(rule.id),
    (items) => items.length > 0,
  );
  assert.equal(run.outcome, "APPLIED");
  assert.equal(run.trigger, "updated");
  assert.equal(run.code, task.code);
  assert.equal(run.ruleName, rule.name);
  assert.equal(run.actions.length, 3);

  // Every action reached the owning feature through its public service.
  const assigned = await waitFor(
    () => request("/tasks/" + task.id),
    (result) => result.body.assignee === "bao.tran",
  );
  assert.equal(assigned.body.status, "Chờ kiểm tra");
  const trail = (
    await waitFor(
      () => request(`/task-comments?taskId=${task.id}`),
      (result) =>
        result.body.items.some((item) => item.author === "Tự động hóa"),
    )
  ).body.items;
  assert.equal(
    trail.find((item) => item.author === "Tự động hóa").body,
    `Công việc ${task.code} đã sẵn sàng kiểm tra.`,
  );
  const inbox = (
    await waitFor(
      () =>
        request(`/notifications?recipient=${encodeURIComponent("quan.ly")}`),
      (result) =>
        result.body.items.some(
          (item) => item.title === `Cần kiểm tra ${task.code}`,
        ),
    )
  ).body.items;
  assert.equal(
    inbox.find((item) => item.title === `Cần kiểm tra ${task.code}`).link,
    `/work-management/tasks?focus=${task.id}`,
  );

  // The rule that watched the new assignee stayed out of the automation write.
  assert.deepEqual(await runsOf(chained.id), []);
  const touched = await waitFor(
    async () => (await request("/automation/rules")).body,
    (page) => page.applied === 1,
  );
  assert.equal(touched.items.find((item) => item.id === rule.id).runCount, 1);
  assert.ok(touched.items.find((item) => item.id === rule.id).lastRunAt);
  assert.equal(touched.skipped, 0);

  // A disabled rule is skipped until someone turns it back on.
  const paused = (
    await request("/automation/rules", "POST", {
      name: "Tạm dừng theo dõi",
      condition: [
        { field: "status", operator: "changedTo", value: "Hoãn lại" },
      ],
      actions: [{ kind: "comment", body: "Đã tạm dừng {{code}}." }],
      enabled: false,
      position: 5,
    })
  ).body;
  const parked = (
    await request("/tasks", "POST", input("tasks", { code: "AUTO-02" }))
  ).body;
  await transition(parked, "Hoãn lại", { reason: "Khách hàng tạm dừng" });
  await sleep(200);
  assert.deepEqual(await runsOf(paused.id), []);

  const enabled = await request(
    `/automation/rules/${paused.id}/toggle`,
    "PATCH",
    {
      enabled: true,
      version: paused.version,
    },
  );
  assert.equal(enabled.status, 200, JSON.stringify(enabled.body));
  assert.equal(enabled.body.enabled, true);
  const later = (
    await request("/tasks", "POST", input("tasks", { code: "AUTO-03" }))
  ).body;
  await transition(later, "Hoãn lại", { reason: "Khách hàng tạm dừng" });
  const pausedRun = await waitFor(
    () => runsOf(paused.id),
    (items) => items.length > 0,
  );
  assert.equal(pausedRun[0].actions[0].body, `Đã tạm dừng ${later.code}.`);

  // Deleting needs the current version; the log keeps the history.
  assert.equal(
    (await request(`/automation/rules/${paused.id}?version=1`, "DELETE"))
      .status,
    409,
  );
  const removed = await request(
    `/automation/rules/${paused.id}?version=${enabled.body.version}`,
    "DELETE",
  );
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.deepEqual(removed.body, { id: paused.id });
  assert.equal(
    (await request("/automation/rules")).body.items.some(
      (item) => item.id === paused.id,
    ),
    false,
  );
  assert.equal((await runsOf(paused.id)).length, 1);

  // The engine is a system actor, not a free pass: it cannot skip a step the
  // state machine does not declare, so the late task keeps its status.
  const direct = (
    await request("/automation/rules", "POST", {
      name: "Đóng công việc ngay",
      condition: [{ field: "code", operator: "is", value: "AUTO-09" }],
      actions: [{ kind: "status", status: "Hoàn thành" }],
      position: 1,
    })
  ).body;
  const late = (
    await request("/tasks", "POST", input("tasks", { code: "AUTO-09" }))
  ).body;
  await sleep(200);
  assert.equal((await runsOf(direct.id)).length, 0);
  await request(`/tasks/${late.id}`, "PATCH", {
    name: "Đổi tên để kích hoạt",
    version: late.version,
  });
  await waitFor(
    () => runsOf(direct.id),
    (items) => items.length > 0,
  );
  await sleep(200);
  assert.equal((await request(`/tasks/${late.id}`)).body.status, "Cần làm");
});
