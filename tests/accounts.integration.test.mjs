import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { databaseUrl, cleanDatabase } from "../apps/api/test/database.mjs";
import { testAdmin, seedTestIdentity } from "../apps/api/test/identity.mjs";
let app, origin, cookie, createApp;
async function request(path, method = "GET", body, session = cookie) {
  const response = await fetch(`${origin}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Cookie: session } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
async function employee(suffix = "one") {
  const result = await request("/employees", "POST", {
    code: `EMP-${suffix.toUpperCase()}`,
    name: `Nhân viên ${suffix}`,
    email: `${suffix}@example.test`,
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body;
}
async function account(suffix = "one", role = "EMPLOYEE") {
  const profile = await employee(suffix);
  const result = await request("/accounts", "POST", {
    employeeId: profile.id,
    username: `user-${suffix}`,
    email: profile.email,
    role,
    password: "Employee-password-123",
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body;
}
async function login(username, password = "Employee-password-123") {
  return request("/auth/login", "POST", { username, password }, null);
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
  await seedTestIdentity();
  const response = await login(testAdmin.username, testAdmin.password);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  cookie = response.cookie;
});
test("account administration requires real authentication and explicit permissions", async () => {
  assert.equal(
    (await request("/accounts", "GET", undefined, null)).status,
    401,
  );
  assert.equal((await request("/tasks", "GET", undefined, null)).status, 401);
  const manager = await account("manager", "MANAGER");
  const session = await login(manager.username);
  assert.equal(session.status, 201);
  assert.equal(session.body.manageAccounts, false);
  assert.equal(
    (await request("/accounts", "GET", undefined, session.cookie)).status,
    403,
  );
  assert.equal(
    (await request("/accounts", "POST", {}, session.cookie)).status,
    403,
  );
  assert.equal(
    (await request("/employees", "POST", {}, session.cookie)).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/account-permissions",
        "POST",
        { accountId: manager.id, manageAccounts: true },
        session.cookie,
      )
    ).status,
    403,
  );
});
test("accounts link real employees, normalize identifiers, reject missing/duplicate links and private fields", async () => {
  const profile = await employee();
  const input = {
    employeeId: profile.id,
    username: " Normal.User ",
    email: "NORMAL@EXAMPLE.TEST",
    role: "EMPLOYEE",
    password: "Employee-password-123",
  };
  const created = await request("/accounts", "POST", input);
  assert.equal(created.status, 201);
  assert.equal(created.body.username, "normal.user");
  assert.equal(created.body.email, "normal@example.test");
  assert.equal(created.body.employeeCode, profile.code);
  assert.equal("passwordHash" in created.body, false);
  assert.equal(
    (
      await request("/accounts", "POST", {
        ...input,
        username: "another-user",
        email: "another@example.test",
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/accounts", "POST", { ...input, employeeId: randomUUID() }))
      .status,
    404,
  );
  assert.equal(
    (await request("/accounts", "POST", { ...input, superAdmin: true })).status,
    400,
  );
  assert.equal(
    (await request("/accounts", "POST", { ...input, role: "OWNER" })).status,
    400,
  );
  const available = await request("/accounts/employees");
  assert.equal(
    available.body.some((row) => row.id === profile.id),
    false,
  );
});
test("account search, status/role filters and pagination return real rows without credentials", async () => {
  await account("alpha");
  await account("beta", "MANAGER");
  const page = await request(
    "/accounts?page=1&pageSize=1&role=EMPLOYEE&q=alpha",
  );
  assert.equal(page.status, 200);
  assert.equal(page.body.total, 1);
  assert.equal(page.body.items[0].username, "user-alpha");
  assert.equal(JSON.stringify(page.body).includes("passwordHash"), false);
  assert.equal((await request("/accounts?status=LOCKED")).body.total, 0);
});
test("updates enforce uniqueness and optimistic versions, and history records only safe data", async () => {
  const first = await account("first");
  const second = await account("second");
  assert.equal(
    (
      await request(`/accounts/${second.id}`, "PATCH", {
        username: first.username,
        email: second.email,
        version: 1,
      })
    ).status,
    409,
  );
  const changed = await request(`/accounts/${first.id}`, "PATCH", {
    username: "renamed-user",
    email: "renamed@example.test",
    version: 1,
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.version, 2);
  assert.equal(
    (
      await request(`/accounts/${first.id}`, "PATCH", {
        username: "stale-user",
        email: first.email,
        version: 1,
      })
    ).status,
    409,
  );
  const history = await request(`/accounts/${first.id}/history`);
  assert.equal(history.status, 200);
  assert.equal(history.body.total, 2);
  assert.ok(
    history.body.items.some(
      (event) =>
        event.before?.username === first.username &&
        event.after?.username === "renamed-user",
    ),
  );
  assert.equal(
    JSON.stringify(history.body).includes("Employee-password-123"),
    false,
  );
});
test("password reset hashes the new secret, revokes sessions and never exposes old/new secrets", async () => {
  const user = await account();
  const session = await login(user.username);
  assert.equal(session.status, 201);
  const reset = await request(`/accounts/${user.id}/password`, "POST", {
    password: "Replacement-password-456",
    version: 1,
  });
  assert.equal(reset.status, 201);
  assert.equal(
    (await request("/auth/me", "GET", undefined, session.cookie)).status,
    401,
  );
  assert.equal((await login(user.username)).status, 401);
  assert.equal(
    (await login(user.username, "Replacement-password-456")).status,
    201,
  );
  const serialized = JSON.stringify(
    (await request(`/accounts/${user.id}/history`)).body,
  );
  assert.equal(serialized.includes("Replacement-password-456"), false);
  assert.equal(serialized.includes("passwordHash"), false);
});
test("locking flags only open assigned tasks, preserves deadlines/assignees and notifies administrators", async () => {
  const user = await account();
  const session = await login(user.username);
  const taskInput = {
    code: "TASK-LOCK",
    name: "Công việc cần bàn giao",
    date: "2026-12-01",
    status: "Cần làm",
    assignee: user.id,
    fields: { managerAccountId: testAdmin.id },
  };
  const task = (await request("/tasks", "POST", taskInput)).body;
  await request("/tasks", "POST", {
    ...taskInput,
    code: "TASK-DONE",
    status: "Hoàn thành",
  });
  const locked = await request(`/accounts/${user.id}/status`, "POST", {
    status: "LOCKED",
    reason: "Nhân viên nghỉ việc",
    version: 1,
  });
  assert.equal(locked.status, 201);
  assert.equal(locked.body.affectedTasks, 1);
  const updated = (await request(`/tasks/${task.id}`)).body;
  assert.equal(updated.assignee, user.id);
  assert.equal(updated.date, task.date);
  assert.equal(updated.fields.reassignmentRequired, true);
  assert.equal(
    (await request("/tasks", "GET", undefined, session.cookie)).status,
    401,
  );
  assert.equal((await login(user.username)).status, 401);
  const notices = (await request("/account-notifications")).body;
  assert.equal(notices.length, 1);
  assert.ok(notices[0].taskIds.includes(task.id));
  const unlocked = await request(`/accounts/${user.id}/status`, "POST", {
    status: "ACTIVE",
    reason: "Quay lại làm việc",
    version: locked.body.version,
  });
  assert.equal(unlocked.status, 201);
  assert.equal((await login(user.username)).status, 201);
  assert.equal(
    (await request(`/tasks/${task.id}`)).body.fields.reassignmentRequired,
    true,
  );
});
test("manager role alone grants no administration; only a super administrator can delegate", async () => {
  const manager = await account("delegate", "MANAGER");
  const before = await login(manager.username);
  assert.equal(before.body.manageAccounts, false);
  assert.equal(
    (
      await request("/account-permissions", "POST", {
        accountId: manager.id,
        manageAccounts: true,
      })
    ).status,
    201,
  );
  assert.equal(
    (await request("/auth/me", "GET", undefined, before.cookie)).status,
    401,
  );
  const after = await login(manager.username);
  assert.equal(
    (await request("/accounts", "GET", undefined, after.cookie)).status,
    200,
  );
  assert.equal(
    (
      await request(
        "/account-permissions",
        "POST",
        { accountId: testAdmin.id, manageAccounts: false },
        after.cookie,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `/accounts/${testAdmin.id}/role`,
        "POST",
        { role: "EMPLOYEE", version: 1 },
        after.cookie,
      )
    ).status,
    403,
  );
  const lowered = await request(`/accounts/${manager.id}/role`, "POST", {
    role: "EMPLOYEE",
    version: 1,
  });
  assert.equal(lowered.status, 201);
  const member = await login(manager.username);
  assert.equal(member.body.manageAccounts, false);
});
test("groups own members and owner, enforce unique directory and retain audit history", async () => {
  const one = await account("one");
  const two = await account("two");
  const input = {
    name: "Ban điều hành",
    directory: "ban-dieu-hanh",
    ownerId: testAdmin.id,
    description: "Nhóm cấp quyền",
    memberIds: [one.id],
  };
  const created = await request("/accounts/groups", "POST", input);
  assert.equal(created.status, 201);
  assert.equal(created.body.members.length, 2);
  assert.equal((await request("/accounts/groups", "POST", input)).status, 409);
  const changed = await request(
    `/accounts/groups/${created.body.id}`,
    "PATCH",
    { ...input, memberIds: [two.id], version: 1 },
  );
  assert.equal(changed.status, 200);
  assert.equal(
    changed.body.members.some((member) => member.accountId === one.id),
    false,
  );
  assert.ok(changed.body.members.some((member) => member.accountId === two.id));
  assert.equal(
    (
      await request(`/accounts/groups/${created.body.id}`, "PATCH", {
        ...input,
        version: 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request(`/accounts/groups/${created.body.id}/history`)).body.total,
    2,
  );
});
test("concurrent duplicate account creation cannot issue two accounts for an employee", async () => {
  const profile = await employee();
  const base = {
    employeeId: profile.id,
    username: "concurrent-user",
    email: profile.email,
    role: "EMPLOYEE",
    password: "Employee-password-123",
  };
  const results = await Promise.all([
    request("/accounts", "POST", base),
    request("/accounts", "POST", {
      ...base,
      username: "other-user",
      email: "other@example.test",
    }),
  ]);
  assert.equal(results.filter((result) => result.status === 201).length, 1);
  assert.ok(results.some((result) => result.status === 409));
});
test("login throttling applies and logout invalidates the stored session", async () => {
  const session = await login(testAdmin.username, testAdmin.password);
  assert.equal(
    (await request("/auth/logout", "POST", {}, session.cookie)).status,
    201,
  );
  assert.equal(
    (await request("/auth/me", "GET", undefined, session.cookie)).status,
    401,
  );
  for (let i = 0; i < 5; i++)
    assert.equal((await login("missing-user", "wrong-password")).status, 401);
  assert.equal((await login("missing-user", "wrong-password")).status, 429);
});
test("bootstrap cannot replace an existing administrator and sessions survive an API restart", async () => {
  const { AccountSetupService } =
    await import("../apps/api/dist/features/tenant-system/index.js");
  await assert.rejects(() =>
    app.get(AccountSetupService).bootstrap({
      code: "BOOT",
      name: "Bootstrap",
      email: "boot@example.test",
      username: "boot-user",
      password: "Bootstrap-password-123",
    }),
  );
  await app.close();
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  origin = await app.getUrl();
  assert.equal((await request("/auth/me")).body.username, testAdmin.username);
});
test("first-run setup creates a real linked administrator and cannot be reused", async () => {
  await cleanDatabase();
  const { AccountSetupService } =
    await import("../apps/api/dist/features/tenant-system/index.js");
  const input = {
    code: "INITIAL",
    name: "Quản trị khởi tạo",
    email: "initial@example.test",
    username: "initial-admin",
    password: "Initial-admin-password-123",
  };
  const account = await app.get(AccountSetupService).bootstrap(input);
  assert.equal(account.role, "MANAGER");
  assert.equal("passwordHash" in account, false);
  const session = await login(input.username, input.password);
  assert.equal(session.status, 201);
  assert.equal(session.body.superAdmin, true);
  assert.equal(
    (await request("/accounts", "GET", undefined, session.cookie)).status,
    200,
  );
  await assert.rejects(() => app.get(AccountSetupService).bootstrap(input));
});
test("a foreign browser origin cannot mutate authenticated application data", async () => {
  const response = await fetch(`${origin}/api/v1/accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: "https://other.example.test",
    },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 403);
});
test("renaming an account preserves task identity for subsequent lock and reassignment", async () => {
  const user = await account("rename");
  const task = (
    await request("/tasks", "POST", {
      code: "RENAME-TASK",
      name: "Task liên kết username",
      date: "2026-12-01",
      status: "Cần làm",
      assignee: user.username,
    })
  ).body;
  const renamed = await request(`/accounts/${user.id}`, "PATCH", {
    username: "renamed-member",
    email: user.email,
    version: 1,
  });
  assert.equal(renamed.status, 200);
  const locked = await request(`/accounts/${user.id}/status`, "POST", {
    status: "LOCKED",
    reason: "Nghỉ việc",
    version: renamed.body.version,
  });
  assert.equal(locked.body.affectedTasks, 1);
  const updated = (await request(`/tasks/${task.id}`)).body;
  assert.equal(updated.assignee, user.username);
  assert.equal(updated.fields.assigneeAccountId, user.id);
  assert.equal(updated.fields.reassignmentRequired, true);
});
