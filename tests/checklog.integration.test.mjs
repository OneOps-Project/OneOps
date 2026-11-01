import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { databaseUrl, cleanDatabase } from "../apps/api/test/database.mjs";
import { seedTestIdentity, testAdmin } from "../apps/api/test/identity.mjs";
let app, origin, cookie, audit;
const ids = { employee: randomUUID(), department: randomUUID() };
async function request(path, method = "GET", body, session = cookie) {
  const response = await fetch(`${origin}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Cookie: session } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const input = (patch = {}) => ({
  module: "hr-management/employees/employee-directory",
  actorId: testAdmin.id,
  actorName: testAdmin.username,
  action: "employee.updated",
  entityType: "employee",
  entityId: ids.employee,
  entityName: "Nhân sự kiểm thử",
  before: { name: "Tên cũ" },
  after: { name: "Tên mới" },
  ...patch,
});
async function sql(text, args = []) {
  assert.ok(new URL(databaseUrl).pathname.endsWith("_test"));
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await client.query(text, args);
  } finally {
    await client.end();
  }
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
  const { createApp } = await import("../apps/api/dist/bootstrap.js");
  const { ChecklogService } =
    await import("../apps/api/dist/features/tenant-system/checklog/index.js");
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  origin = await app.getUrl();
  audit = app.get(ChecklogService);
});
after(async () => {
  await app?.close();
});
beforeEach(async () => {
  await cleanDatabase();
  await seedTestIdentity();
  const login = await request(
    "/auth/login",
    "POST",
    { username: testAdmin.username, password: testAdmin.password },
    null,
  );
  assert.equal(login.status, 201);
  cookie = login.cookie;
});
test("central audit combines module, actor, action, object and result filters", async () => {
  await audit.record(input());
  await audit.record(
    input({
      result: "FAILURE",
      actorName: "other-manager",
      entityName: "Không tìm thấy hồ sơ",
    }),
  );
  await audit.record(
    input({
      module: "hr-management/organization/departments-teams",
      action: "department.updated",
      entityType: "department",
      entityId: ids.department,
      entityName: "Phòng Nhân sự",
      result: "DENIED",
    }),
  );
  const all = await request("/checklog");
  assert.equal(all.status, 200);
  assert.equal(all.body.total, 3);
  assert.deepEqual(all.body.summary, { success: 1, failure: 1, denied: 1 });
  assert.equal("before" in all.body.items[0], false);
  const filtered = await request(
    `/checklog?module=hr-management/employees/employee-directory&actor=${testAdmin.id}&action=employee.updated&entityType=employee&entityId=${ids.employee}&result=SUCCESS`,
  );
  assert.equal(filtered.body.total, 1);
  assert.equal(filtered.body.items[0].actorName, testAdmin.username);
  assert.equal(
    (await request("/checklog?q=Ph%C3%B2ng%20Nh%C3%A2n%20s%E1%BB%B1")).body
      .total,
    1,
  );
  assert.equal((await request(`/checklog?q=${ids.department}`)).body.total, 1);
  assert.equal((await request("/checklog?actor=other-manager")).body.total, 1);
});
test("audit pagination is stable and counters describe the filtered result", async () => {
  for (let i = 0; i < 25; i++)
    await audit.record(
      input({
        entityName: `Nhân sự ${i}`,
        result: i < 20 ? "SUCCESS" : "FAILURE",
      }),
    );
  const first = (await request("/checklog?page=1&pageSize=20")).body;
  const second = (await request("/checklog?page=2&pageSize=20")).body;
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 5);
  assert.equal(first.total, 25);
  assert.equal(
    new Set([...first.items, ...second.items].map((row) => row.id)).size,
    25,
  );
  const failures = (await request("/checklog?result=FAILURE")).body;
  assert.equal(failures.total, 5);
  assert.deepEqual(failures.summary, { success: 0, failure: 5, denied: 0 });
});
test("date filters include the complete selected day in Vietnam time", async () => {
  for (const date of [
    "2026-10-29T16:59:59.000Z",
    "2026-10-29T17:00:00.000Z",
    "2026-10-30T16:59:59.999Z",
    "2026-10-30T17:00:00.000Z",
  ]) {
    await sql(
      'INSERT INTO "tenant_audit"."entries" (id,"actorId","actorName",action,"entityType","entityId","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [
        randomUUID(),
        testAdmin.id,
        testAdmin.username,
        "account.updated",
        "account",
        testAdmin.id,
        date,
      ],
    );
  }
  const result = await request("/checklog?from=2026-10-30&to=2026-10-30");
  assert.equal(result.status, 200);
  assert.equal(result.body.total, 2);
});
test("new audit data is redacted before persistence, including nested objects and arrays", async () => {
  const row = await audit.record(
    input({
      before: {
        email: "private@example.test",
        password: "Password-123456",
        salary: 5000000,
      },
      after: {
        passwordChanged: true,
        profile: {
          phone: "0901234567",
          cccd: "012345678901",
          api_key: "api-secret",
        },
        sessions: [
          {
            refreshToken: "refresh-secret",
            authorization: "Bearer secret-value",
          },
        ],
        note: "Contact private@example.test",
      },
    }),
  );
  const detail = await request(`/checklog/${row.id}`);
  assert.equal(detail.status, 200);
  const text = JSON.stringify(detail.body);
  for (const secret of [
    "private@example.test",
    "Password-123456",
    "0901234567",
    "012345678901",
    "api-secret",
    "refresh-secret",
    "secret-value",
    "5000000",
  ])
    assert.equal(text.includes(secret), false, secret);
  assert.equal(detail.body.after.passwordChanged, true);
  assert.equal(detail.body.after.profile.phone, "[Đã che]");
  assert.equal(detail.body.before.salary, "[Đã che]");
  const stored = await sql(
    'SELECT "before","after" FROM "tenant_audit"."entries" WHERE id=$1',
    [row.id],
  );
  assert.equal(JSON.stringify(stored.rows).includes("Password-123456"), false);
  assert.equal(JSON.stringify(stored.rows).includes("refresh-secret"), false);
});
test("legacy audit values are redacted by detail and existing object-history APIs without rewriting records", async () => {
  const id = randomUUID();
  const original = {
    passwordHash: "legacy-hash",
    profile: { email: "legacy@example.test", bankAccountNumber: "123456789" },
  };
  await sql(
    'INSERT INTO "tenant_audit"."entries" (id,"actorId","actorName",action,"entityType","entityId","before","after") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      id,
      testAdmin.id,
      testAdmin.username,
      "account.updated",
      "account",
      testAdmin.id,
      original,
      { username: testAdmin.username },
    ],
  );
  const detail = await request(`/checklog/${id}`);
  const history = await request(`/accounts/${testAdmin.id}/history`);
  for (const response of [detail, history]) {
    assert.equal(response.status, 200);
    assert.equal(JSON.stringify(response.body).includes("legacy-hash"), false);
    assert.equal(
      JSON.stringify(response.body).includes("legacy@example.test"),
      false,
    );
    assert.equal(JSON.stringify(response.body).includes("123456789"), false);
  }
  const stored = await sql(
    'SELECT "before" FROM "tenant_audit"."entries" WHERE id=$1',
    [id],
  );
  assert.equal(stored.rows[0].before.passwordHash, "legacy-hash");
});
test("only authorized auditors can list, filter or open detail; account administration alone is insufficient", async () => {
  const event = await audit.record(input());
  assert.equal(
    (await request("/checklog", "GET", undefined, null)).status,
    401,
  );
  const employee = await request("/employees", "POST", {
    code: "AUDIT-MANAGER",
    name: "Quản lý tài khoản",
    email: "audit-manager@example.test",
  });
  const account = await request("/accounts", "POST", {
    employeeId: employee.body.id,
    username: "audit-manager",
    email: employee.body.email,
    role: "MANAGER",
    password: "Audit-manager-password-123",
  });
  assert.equal(account.status, 201);
  assert.equal(
    (
      await request("/account-permissions", "POST", {
        accountId: account.body.id,
        manageAccounts: true,
      })
    ).status,
    201,
  );
  const session = await request(
    "/auth/login",
    "POST",
    { username: "audit-manager", password: "Audit-manager-password-123" },
    null,
  );
  assert.equal(session.status, 201);
  for (const path of [
    "/checklog",
    "/checklog/filters",
    `/checklog/${event.id}`,
  ])
    assert.equal(
      (await request(path, "GET", undefined, session.cookie)).status,
      403,
    );
  assert.equal(
    (
      await request(
        `/accounts/${account.body.id}/history`,
        "GET",
        undefined,
        session.cookie,
      )
    ).status,
    200,
  );
});
test("filters are discovered from real events and invalid requests are rejected", async () => {
  await audit.record(input());
  await audit.record(
    input({
      module: "tenant-system/access-control/accounts",
      action: "account.updated",
      entityType: "account",
    }),
  );
  const filters = await request("/checklog/filters");
  assert.equal(filters.status, 200);
  assert.equal(filters.body.modules.length, 2);
  assert.ok(filters.body.actions.includes("employee.updated"));
  assert.ok(filters.body.entityTypes.includes("account"));
  for (const query of [
    "page=0",
    "pageSize=101",
    "result=UNKNOWN",
    "entityId=invalid",
    "from=2026-10-31&to=2026-10-01",
    "from=not-a-date",
    "unexpected=true",
  ])
    assert.equal((await request(`/checklog?${query}`)).status, 400, query);
  assert.equal((await request("/checklog/not-a-uuid")).status, 400);
  assert.equal((await request(`/checklog/${randomUUID()}`)).status, 404);
});
test("normal HTTP operations cannot create, update or delete audit records", async () => {
  const event = await audit.record(input());
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    const path = method === "POST" ? "/checklog" : `/checklog/${event.id}`;
    assert.equal((await request(path, method, {})).status, 404);
  }
  assert.equal((await request("/checklog")).body.total, 1);
  assert.equal(
    (await request(`/checklog/${event.id}`)).body.action,
    "employee.updated",
  );
});
test("successful account changes remain one audit source for object history and central search", async () => {
  const profile = await request("/employees", "POST", {
    code: "SINGLE",
    name: "Một nguồn nhật ký",
    email: "single@example.test",
  });
  const account = await request("/accounts", "POST", {
    employeeId: profile.body.id,
    username: "single-account",
    email: profile.body.email,
    role: "EMPLOYEE",
    password: "Single-account-password-123",
  });
  assert.equal(account.status, 201);
  const history = (await request(`/accounts/${account.body.id}/history`)).body;
  const central = (await request(`/checklog?entityId=${account.body.id}`)).body;
  assert.equal(history.total, 1);
  assert.equal(central.total, 1);
  assert.equal(central.items[0].id, history.items[0].id);
  const rejected = await request("/accounts", "POST", {
    employeeId: profile.body.id,
    username: "duplicate-single",
    email: "other@example.test",
    role: "EMPLOYEE",
    password: "Single-account-password-123",
  });
  assert.equal(rejected.status, 409);
  assert.equal(
    (await request(`/checklog?entityId=${account.body.id}`)).body.total,
    1,
  );
});
