import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import modules from "../modules.json" with { type: "json" };
import { databaseUrl, cleanDatabase } from "../apps/api/test/database.mjs";
import { DepartmentService } from "../apps/api/dist/features/hr-management/organization/departments-teams/services/department.service.js";
import { TeamService } from "../apps/api/dist/features/hr-management/organization/departments-teams/services/team.service.js";
import { MEMBER_REMOVED_FROM_TEAM } from "../apps/api/dist/features/hr-management/organization/departments-teams/events/org-event.listener.js";
import { OrgRealtimeService } from "../apps/api/dist/features/hr-management/organization/departments-teams/events/org-realtime.service.js";
import { Database } from "../apps/api/dist/core/database/database.module.js";
let app, origin, createApp;
let departments, teams, events, realtime, database;
const statuses = {
  "workspace-today": "Đang dùng",
  tasks: "Cần làm",
  "project-spaces": "Lên kế hoạch",
  calendar: "Đã lên lịch",
  "tickets-approvals": "Chờ duyệt",
  "internal-chat": "Đang mở",
  "knowledge-sop": "Bản nháp",
  reports: "Bản nháp",
};
const recordModules = modules.filter((module) => module.recordTable !== false);
const input = (module = "tasks", patch = {}) => ({
  code: "WORK-01",
  name: "Công việc kiểm thử",
  date: "2026-11-15",
  status: statuses[module],
  fields: {},
  ...patch,
});
async function request(route, method = "GET", body, extraHeaders = {}) {
  const response = await fetch(`${origin}/api/v1${route}`, {
    method,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
const mockHeaders = (
  id,
  role,
  { isSuperAdmin = false, permissions = [] } = {},
) => ({
  "x-mock-user-id": id,
  "x-mock-role": role,
  "x-mock-is-super-admin": String(isSuperAdmin),
  ...(permissions.length
    ? { "x-mock-permissions": permissions.join(",") }
    : {}),
});
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
  departments = app.get(DepartmentService);
  teams = app.get(TeamService);
  events = app.get(EventEmitter2);
  realtime = app.get(OrgRealtimeService);
  database = app.get(Database);
});
after(async () => {
  await app?.close();
});
beforeEach(cleanDatabase);
test("registered record implementations own separate CRUD APIs and namespaces", async () => {
  for (const module of recordModules) {
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
    status: "Đang thực hiện",
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.note, "Mô tả giữ nguyên");
  assert.equal(saved.body.fields.priority, "Cao");
  assert.equal(saved.body.version, 2);
  assert.equal(
    (
      await request("/tasks/" + created.id, "PATCH", {
        version: 1,
        status: "Hoàn thành",
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
test("strict domain validation rejects foreign fields, invalid status, dates and progress", async () => {
  for (const patch of [
    { name: " " },
    { status: "Không hợp lệ" },
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
test("checklists and comments persist as structured task data", async () => {
  const task = (await request("/tasks", "POST", input())).body;
  const id = crypto.randomUUID();
  const result = await request("/tasks/" + task.id, "PATCH", {
    version: 1,
    fields: {
      checklist: [{ id, title: "Kiểm tra bàn giao", done: true }],
      comments: [
        {
          id: crypto.randomUUID(),
          text: "Đã xác nhận",
          author: "Người kiểm thử",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.fields.checklist[0].done, true);
  assert.equal(
    (await request("/tasks/" + task.id)).body.fields.comments[0].text,
    "Đã xác nhận",
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
  await request(
    "/tasks",
    "POST",
    input("tasks", {
      code: "TASK-B",
      name: "Kiểm thử",
      status: "Hoàn thành",
      assignee: "Bình",
    }),
  );
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
    request("/tasks/" + task.id, "PATCH", { version: 1, status: "Hoàn thành" }),
    request("/tasks/" + task.id, "PATCH", {
      version: 1,
      status: "Chờ phản hồi",
    }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
});
test("workspace aggregates every task page and real project/request/calendar data", async () => {
  for (let i = 0; i < 101; i++)
    assert.equal(
      (
        await request(
          "/tasks",
          "POST",
          input("tasks", {
            code: "TASK-" + i,
            date: "2000-01-01",
            status: i < 50 ? "Hoàn thành" : "Cần làm",
          }),
        )
      ).status,
      201,
    );
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
  departments = app.get(DepartmentService);
  teams = app.get(TeamService);
  events = app.get(EventEmitter2);
  realtime = app.get(OrgRealtimeService);
  assert.equal((await request("/tasks/" + task.id)).body.name, task.name);
  assert.equal((await request("/manage-information")).status, 404);
  assert.equal((await request("/teams")).status, 404);
  assert.equal((await request("/case-transfers", "POST", {})).status, 404);
});

test("departments enforce active-name uniqueness and mock dependency checks allow deactivation", async () => {
  const actor = {
    id: randomUUID(),
    role: "MANAGER",
    isSuperAdmin: true,
    permissions: [],
  };
  const managerId = randomUUID();
  const department = await departments.create(
    {
      name: "Schema-backed department",
      administratorIds: [managerId],
      accessUserIds: [],
      accessGroupIds: [],
    },
    actor,
  );
  const team = await teams.create(
    {
      name: "Schema-backed team",
      departmentId: department.id,
      managerIds: [managerId],
      memberUserIds: [],
      memberGroupIds: [],
    },
    actor,
  );
  assert.deepEqual(team.memberUserIds, [managerId]);
  await assert.rejects(
    departments.create(
      {
        name: "Schema-backed department",
        administratorIds: [randomUUID()],
        accessUserIds: [],
        accessGroupIds: [],
      },
      actor,
    ),
    (error) => error.getStatus() === 409,
  );
  await assert.rejects(
    departments.setStatus(department.id, "INACTIVE", actor),
    (error) => error.getStatus() === 409,
  );
  const inactiveTeam = await teams.setStatus(team.id, "INACTIVE", actor);
  assert.equal(inactiveTeam.status, "INACTIVE");
  const inactiveDepartment = await departments.setStatus(
    department.id,
    "INACTIVE",
    actor,
  );
  assert.equal(inactiveDepartment.status, "INACTIVE");
  const replacement = await departments.create(
    {
      name: "Schema-backed department",
      administratorIds: [randomUUID()],
      accessUserIds: [],
      accessGroupIds: [],
    },
    actor,
  );
  assert.equal(replacement.status, "ACTIVE");
  const history = await departments.getHistory(
    department.id,
    { page: 1, pageSize: 25 },
    actor,
  );
  assert.deepEqual(history.items.map((entry) => entry.action).sort(), [
    "CREATE",
    "UPDATE",
  ]);
});

test("team transfer is atomic, keeps one-team membership, logs history, and emits the event", async () => {
  const actor = {
    id: randomUUID(),
    role: "MANAGER",
    isSuperAdmin: true,
    permissions: [],
  };
  const memberId = randomUUID();
  const oldTeam = await createTeamForTest(teams, actor, {
    name: "Transfer source",
    managerIds: [randomUUID()],
    memberUserIds: [memberId],
  });
  const targetTeam = await createTeamForTest(teams, actor, {
    name: "Transfer target",
    managerIds: [randomUUID()],
    memberUserIds: [],
  });
  const received = [];
  const taskLogs = [];
  const originalLog = console.log;
  console.log = (...values) => taskLogs.push(values.join(" "));
  const listener = (payload) => received.push(payload);
  events.on(MEMBER_REMOVED_FROM_TEAM, listener);
  try {
    const preview = await teams.previewTransfer(
      targetTeam.id,
      { targetTeamId: targetTeam.id, userIds: [memberId] },
      actor,
    );
    assert.deepEqual(preview.transfers, [
      {
        userId: memberId,
        oldTeamId: oldTeam.id,
        oldTeamName: oldTeam.name,
        willTransfer: true,
      },
    ]);
    const transfer = await teams.transfer(
      targetTeam.id,
      { targetTeamId: targetTeam.id, userIds: [memberId] },
      actor,
    );
    assert.deepEqual(transfer.transfers, [
      { userId: memberId, oldTeamId: oldTeam.id },
    ]);
  } finally {
    events.off(MEMBER_REMOVED_FROM_TEAM, listener);
    console.log = originalLog;
  }
  assert.deepEqual(received, [{ userId: memberId, oldTeamId: oldTeam.id }]);
  assert.ok(
    taskLogs.some((message) =>
      message.includes(
        `[MOCK TASK MODULE] Received member_removed event. Flagging tasks for user ${memberId} in team ${oldTeam.id} to "Cần giao lại".`,
      ),
    ),
  );
  assert.deepEqual((await teams.get(oldTeam.id, actor)).memberUserIds, [
    oldTeam.managerIds[0],
  ]);
  assert.deepEqual(
    (await teams.get(targetTeam.id, actor)).memberUserIds.sort(),
    [memberId, targetTeam.managerIds[0]].sort(),
  );
});

test("creating a Team previews, confirms, logs, and emits member transfers", async () => {
  const actor = {
    id: randomUUID(),
    role: "MANAGER",
    isSuperAdmin: true,
    permissions: [],
  };
  const department = await departments.create(
    {
      name: `Create transfer ${randomUUID()}`,
      administratorIds: [actor.id],
      accessUserIds: [],
      accessGroupIds: [],
    },
    actor,
  );
  const memberId = randomUUID();
  const oldTeam = await teams.create(
    {
      name: "Create transfer source",
      departmentId: department.id,
      managerIds: [randomUUID()],
      memberUserIds: [memberId],
      memberGroupIds: [],
    },
    actor,
  );
  const input = {
    name: "Create transfer target",
    departmentId: department.id,
    managerIds: [randomUUID()],
    memberUserIds: [memberId],
    memberGroupIds: [],
  };
  const preview = await teams.previewCreateTransfers(
    department.id,
    { userIds: [memberId] },
    actor,
  );
  assert.deepEqual(preview.transfers, [
    {
      userId: memberId,
      oldTeamId: oldTeam.id,
      oldTeamName: oldTeam.name,
      willTransfer: true,
    },
  ]);
  await assert.rejects(
    teams.create(input, actor),
    (error) => error.getStatus() === 409,
  );

  const emitted = [];
  const realtimeChanges = [];
  const realtimeSubscription = realtime.stream().subscribe((event) => {
    realtimeChanges.push(event.data);
  });
  const listener = (payload) => emitted.push(payload);
  events.on(MEMBER_REMOVED_FROM_TEAM, listener);
  let newTeam;
  try {
    newTeam = await teams.create(
      { ...input, confirmTransferUserIds: [memberId] },
      actor,
    );
  } finally {
    events.off(MEMBER_REMOVED_FROM_TEAM, listener);
    realtimeSubscription.unsubscribe();
  }
  assert.deepEqual(emitted, [{ userId: memberId, oldTeamId: oldTeam.id }]);
  assert.ok(
    realtimeChanges.some(
      (change) => change.resource === "team" && change.id === oldTeam.id,
    ),
  );
  assert.deepEqual((await teams.get(oldTeam.id, actor)).memberUserIds, [
    oldTeam.managerIds[0],
  ]);
  assert.deepEqual(
    (await teams.get(newTeam.id, actor)).memberUserIds.sort(),
    [memberId, input.managerIds[0]].sort(),
  );
  assert.ok(
    (
      await teams.getHistory(oldTeam.id, { page: 1, pageSize: 25 }, actor)
    ).items.some((entry) => entry.action === "TRANSFER"),
  );
  assert.ok(
    (
      await teams.getHistory(newTeam.id, { page: 1, pageSize: 25 }, actor)
    ).items.some((entry) => entry.action === "TRANSFER"),
  );
});

test("department-team mock auth defaults locally and remains disabled in production", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "test";
    const listed = await request("/departments");
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    const created = await request("/departments", "POST", {
      name: "Default mock admin department",
      administratorIds: ["00000000-0000-4000-8000-000000000101"],
      accessUserIds: [],
      accessGroupIds: [],
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));

    process.env.NODE_ENV = "production";
    assert.equal((await request("/departments")).status, 401);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("organization realtime stream broadcasts successful department mutations", async () => {
  const controller = new AbortController();
  const response = await fetch(`${origin}/api/v1/organization/events`, {
    headers: { Accept: "text/event-stream" },
    signal: controller.signal,
  });
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") || "",
    /text\/event-stream/,
  );
  assert.ok(response.body);

  const reader = response.body.getReader();
  const eventPromise = (async () => {
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      assert.equal(
        done,
        false,
        "Realtime stream closed before sending an event",
      );
      buffer += decoder.decode(value, { stream: true });
      const match = buffer.match(/data:\s*(\{[^\n]+\})/);
      if (match) return JSON.parse(match[1]);
    }
  })();

  const created = await request("/departments", "POST", {
    name: "Realtime verification department",
    administratorIds: ["00000000-0000-4000-8000-000000000101"],
    accessUserIds: [],
    accessGroupIds: [],
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.deepEqual(await eventPromise, {
    resource: "department",
    action: "created",
    id: created.body.id,
  });
  controller.abort();
  await reader.cancel().catch(() => undefined);
});

test("department/team scopes follow role, administration and membership", async () => {
  const departmentAdmin = randomUUID();
  const manager = randomUUID();
  const employee = randomUUID();
  const otherManager = randomUUID();
  const createdDepartment = await request("/departments", "POST", {
    name: "Scoped organization",
    administratorIds: [departmentAdmin],
    accessUserIds: [manager],
    accessGroupIds: [],
  });
  assert.equal(createdDepartment.status, 201);

  const managerHeaders = mockHeaders(manager, "MANAGER");
  assert.equal(
    (
      await request(
        "/departments",
        "POST",
        {
          name: "Unauthorized department",
          administratorIds: [manager],
          accessUserIds: [],
          accessGroupIds: [],
        },
        managerHeaders,
      )
    ).status,
    403,
  );
  const grantedDepartment = await request(
    "/departments",
    "POST",
    {
      name: "Granted department",
      administratorIds: [manager],
      accessUserIds: [],
      accessGroupIds: [],
    },
    mockHeaders(manager, "MANAGER", {
      permissions: ["organization.department.create"],
    }),
  );
  assert.equal(grantedDepartment.status, 201);

  const makeTeam = (name, managerIds, memberUserIds = []) =>
    request("/teams", "POST", {
      name,
      departmentId: createdDepartment.body.id,
      managerIds,
      memberUserIds,
      memberGroupIds: [],
    });
  const teamA = await makeTeam("Scoped A", [manager], [employee]);
  const teamB = await makeTeam("Scoped B", [otherManager]);
  const teamC = await makeTeam("Scoped C", [manager]);
  assert.equal(teamA.status, 201, JSON.stringify(teamA.body));
  assert.equal(teamB.status, 201, JSON.stringify(teamB.body));
  assert.equal(teamC.status, 201, JSON.stringify(teamC.body));

  assert.equal(
    (
      await request(
        `/teams/${teamA.body.id}`,
        "PUT",
        { name: "Scoped A updated" },
        managerHeaders,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        `/teams/${teamB.body.id}`,
        "PUT",
        { name: "Scoped B denied" },
        managerHeaders,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `/departments/${createdDepartment.body.id}`,
        "PUT",
        { name: "Manager cannot edit department" },
        managerHeaders,
      )
    ).status,
    403,
  );

  const employeeHeaders = mockHeaders(employee, "EMPLOYEE");
  assert.equal(
    (
      await request(
        `/teams/${teamA.body.id}`,
        "GET",
        undefined,
        employeeHeaders,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        `/teams/${teamB.body.id}`,
        "GET",
        undefined,
        employeeHeaders,
      )
    ).status,
    404,
  );
  const employeeTeams = await request(
    `/departments/${createdDepartment.body.id}/teams`,
    "GET",
    undefined,
    employeeHeaders,
  );
  assert.deepEqual(
    employeeTeams.body.items.map((team) => team.id),
    [teamA.body.id],
  );
  const duplicateMembership = await makeTeam(
    "Employee duplicate",
    [randomUUID()],
    [employee],
  );
  assert.equal(duplicateMembership.status, 409);
});

test("team update removal emits member-removed event after commit", async () => {
  const userId = randomUUID();
  const department = await request("/departments", "POST", {
    name: "Member removal event department",
    administratorIds: [randomUUID()],
    accessUserIds: [],
    accessGroupIds: [],
  });
  const team = await request("/teams", "POST", {
    name: "Member removal event team",
    departmentId: department.body.id,
    managerIds: [randomUUID()],
    memberUserIds: [userId],
    memberGroupIds: [],
  });
  assert.equal(team.status, 201, JSON.stringify(team.body));

  const emitted = [];
  const listener = (payload) => emitted.push(payload);
  events.on(MEMBER_REMOVED_FROM_TEAM, listener);
  try {
    const updated = await request(`/teams/${team.body.id}`, "PUT", {
      memberUserIds: [],
    });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
  } finally {
    events.off(MEMBER_REMOVED_FROM_TEAM, listener);
  }
  assert.deepEqual(emitted, [{ userId, oldTeamId: team.body.id }]);
  assert.equal(
    (await request(`/teams/${team.body.id}`)).body.memberUserIds.includes(
      userId,
    ),
    false,
  );
});

test("active names are case-insensitively unique and may be reused after deactivation", async () => {
  const department = await request("/departments", "POST", {
    name: "Operations",
    administratorIds: [randomUUID()],
    accessUserIds: [],
    accessGroupIds: [],
  });
  assert.equal(department.status, 201);
  const duplicateDepartment = await request("/departments", "POST", {
    name: "operations",
    administratorIds: [randomUUID()],
    accessUserIds: [],
    accessGroupIds: [],
  });
  assert.equal(duplicateDepartment.status, 409);

  await database.department.update({
    where: { id: department.body.id },
    data: { status: "INACTIVE" },
  });
  const reusedDepartmentName = await request("/departments", "POST", {
    name: "OPERATIONS",
    administratorIds: [randomUUID()],
    accessUserIds: [],
    accessGroupIds: [],
  });
  assert.equal(reusedDepartmentName.status, 201);

  const createTeam = (name) =>
    request("/teams", "POST", {
      name,
      departmentId: reusedDepartmentName.body.id,
      managerIds: [randomUUID()],
      memberUserIds: [],
      memberGroupIds: [],
    });
  const team = await createTeam("People Operations");
  assert.equal(team.status, 201);
  assert.equal((await createTeam("people operations")).status, 409);
  await database.team.update({
    where: { id: team.body.id },
    data: { status: "INACTIVE" },
  });
  assert.equal((await createTeam("PEOPLE OPERATIONS")).status, 201);
});

test("department and Team deactivation succeed when mocked dependency checks pass", async () => {
  const department = await request("/departments", "POST", {
    name: "Pending dependency checks",
    administratorIds: [randomUUID()],
    accessUserIds: [],
    accessGroupIds: [],
  });
  const team = await request("/teams", "POST", {
    name: "Pending task check",
    departmentId: department.body.id,
    managerIds: [randomUUID()],
    memberUserIds: [],
    memberGroupIds: [],
  });
  assert.equal(team.status, 201);

  const departmentBlocked = await request(
    `/departments/${department.body.id}/status`,
    "PATCH",
    { status: "INACTIVE" },
  );
  assert.equal(departmentBlocked.status, 409);
  assert.match(departmentBlocked.body.message, /Pending task check/);

  const taskCheckPassed = await request(
    `/teams/${team.body.id}/status`,
    "PATCH",
    { status: "INACTIVE" },
  );
  assert.equal(
    taskCheckPassed.status,
    200,
    JSON.stringify(taskCheckPassed.body),
  );
  assert.equal(taskCheckPassed.body.status, "INACTIVE");

  const projectCheckPassed = await request(
    `/departments/${department.body.id}/status`,
    "PATCH",
    { status: "INACTIVE" },
  );
  assert.equal(
    projectCheckPassed.status,
    200,
    JSON.stringify(projectCheckPassed.body),
  );
  assert.equal(projectCheckPassed.body.status, "INACTIVE");
});

// TODO: [INTEGRATION] - Replace these mock-auth requests and fake account IDs with real Auth/Accounts integration tests.
test("mock-auth exercises last-admin rejection, active-team deactivation, transfer events, and history", async () => {
  const userId = "00000000-0000-4000-8000-000000000101";
  const departmentResponse = await request("/departments", "POST", {
    name: "BR verification department",
    administratorIds: [userId],
    accessUserIds: [],
    accessGroupIds: [],
  });
  assert.equal(departmentResponse.status, 201);
  const department = departmentResponse.body;

  const removeLastAdmin = await request(
    `/departments/${department.id}`,
    "PUT",
    { administratorIds: [] },
  );
  assert.equal(removeLastAdmin.status, 400);
  assert.deepEqual(departmentResponse.body.administratorIds, [userId]);

  const makeTeam = async (name, members) =>
    request("/teams", "POST", {
      name,
      departmentId: department.id,
      managerIds: [randomUUID()],
      memberUserIds: members,
      memberGroupIds: [],
    });
  const teamAResponse = await makeTeam("Team A", [userId]);
  const teamBResponse = await makeTeam("Team B", []);
  assert.equal(teamAResponse.status, 201, JSON.stringify(teamAResponse.body));
  assert.equal(teamBResponse.status, 201, JSON.stringify(teamBResponse.body));
  const teamA = teamAResponse.body;
  const teamB = teamBResponse.body;
  assert.ok(teamA.memberUserIds.includes(userId), JSON.stringify(teamA));

  const deactivation = await request(
    `/departments/${department.id}/status`,
    "PATCH",
    { status: "INACTIVE" },
  );
  assert.equal(deactivation.status, 409);

  const emitted = [];
  const listener = (payload) => emitted.push(payload);
  events.on(MEMBER_REMOVED_FROM_TEAM, listener);
  let transfer;
  try {
    transfer = await request(`/teams/${teamB.id}/transfer`, "POST", {
      targetTeamId: teamB.id,
      userIds: [userId],
    });
  } finally {
    events.off(MEMBER_REMOVED_FROM_TEAM, listener);
  }
  assert.equal(transfer.status, 201, JSON.stringify(transfer.body));
  assert.deepEqual(
    emitted,
    [{ userId, oldTeamId: teamA.id }],
    JSON.stringify(transfer.body),
  );

  const [
    teamAAfter,
    teamBAfter,
    departmentHistory,
    teamAHistory,
    teamBHistory,
  ] = await Promise.all([
    request(`/teams/${teamA.id}`),
    request(`/teams/${teamB.id}`),
    request(`/departments/${department.id}/history`),
    request(`/teams/${teamA.id}/history`),
    request(`/teams/${teamB.id}/history`),
  ]);
  assert.equal(teamAAfter.status, 200);
  assert.equal(teamBAfter.status, 200);
  assert.equal(teamAAfter.body.memberUserIds.includes(userId), false);
  assert.equal(teamBAfter.body.memberUserIds.includes(userId), true);
  assert.ok(
    departmentHistory.body.items.some((entry) => entry.action === "CREATE"),
  );
  assert.ok(teamAHistory.body.items.some((entry) => entry.action === "CREATE"));
  assert.ok(
    teamAHistory.body.items.some((entry) => entry.action === "TRANSFER"),
  );
  assert.ok(
    teamBHistory.body.items.some((entry) => entry.action === "TRANSFER"),
  );
});

async function createTeamForTest(service, actor, input) {
  const department = await departments.create(
    {
      name: `Department ${randomUUID()}`,
      administratorIds: [actor.id],
      accessUserIds: [],
      accessGroupIds: [],
    },
    actor,
  );
  return service.create(
    {
      departmentId: department.id,
      description: undefined,
      memberGroupIds: [],
      ...input,
    },
    actor,
  );
}
