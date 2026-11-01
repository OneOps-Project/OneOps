import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import modules from "../modules.json" with { type: "json" };
import { databaseUrl, cleanDatabase } from "../apps/api/test/database.mjs";
let app, origin, createApp;
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
const input = (module = "tasks", patch = {}) => ({
  code: "WORK-01",
  name: "Công việc kiểm thử",
  date: "2026-11-15",
  status: statuses[module],
  assignee: "nguyen-van-a",
  reviewer: "tran-thi-b",
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  fields: {},
  ...patch,
});

async function requestWithHeaders(route, method = "GET", body, headers = {}) {
  const response = await fetch(`${origin}/api/v1${route}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
async function request(route, method = "GET", body) {
  const response = await fetch(`${origin}/api/v1${route}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
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
beforeEach(cleanDatabase);
test("eight implementations own separate CRUD APIs, codes, records and namespaces", async () => {
  for (const module of modules) {
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
    status: "Đang làm",
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
    request("/tasks/" + task.id, "PATCH", { version: 1, status: "Đang làm" }),
    request("/tasks/" + task.id, "PATCH", {
      version: 1,
      status: "Chờ kiểm tra",
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

// ─── ROUND1-2: Validate tạo task ─────────────────────────────────────────────
test("ROUND1-2: validate reviewer khác assignee", async () => {
  const res = await request("/tasks", "POST", input("tasks", {
    assignee: "nguyen-van-a",
    reviewer: "nguyen-van-a", // trùng → phải lỗi
  }));
  assert.equal(res.status, 400, "reviewer === assignee phải bị từ chối");
});

test("ROUND1-2: validate deadline không ở quá khứ", async () => {
  const res = await request("/tasks", "POST", input("tasks", {
    deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 giờ trước
  }));
  assert.equal(res.status, 400, "deadline quá khứ phải bị từ chối");
});

test("ROUND1-2: tạo task hợp lệ có reviewer và deadline", async () => {
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const res = await request("/tasks", "POST", input("tasks", {
    assignee: "nguyen-van-a",
    reviewer: "tran-thi-b",
    deadline,
  }));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.assignee, "nguyen-van-a");
  assert.equal(res.body.reviewer, "tran-thi-b");
  assert.ok(res.body.deadline, "deadline phải được lưu");
  assert.ok(Array.isArray(res.body.statusHistory), "statusHistory phải là array");
  assert.equal(res.body.statusHistory.length, 1, "Phải có 1 bản ghi trong lịch sử khi tạo");
});

test("ROUND1-2: lưu link đính kèm", async () => {
  const res = await request("/tasks", "POST", input("tasks", {
    code: "WORK-LINK",
    attachmentLinks: ["https://example.com/doc"],
  }));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.deepEqual(res.body.attachmentLinks, ["https://example.com/doc"]);
});

test("ROUND1-2: kiểm tra task trùng tên gần giống cùng assignee", async () => {
  await request("/tasks", "POST", input("tasks", {
    code: "WORK-EXIST",
    name: "Thiết kế giao diện đăng nhập",
    assignee: "nguyen-van-a",
  }));
  const res = await request(
    "/tasks/check-similar?assignee=nguyen-van-a&name=" +
    encodeURIComponent("Thiết kế giao diện"),
  );
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length > 0, "Phải tìm thấy task tương tự");
});

// ─── ROUND1-4: Máy trạng thái ────────────────────────────────────────────────
test("ROUND1-4: chuyển trạng thái hợp lệ TR-02 Cần làm → Đang làm (assignee)", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    status: "Cần làm",
    assignee: "nguyen-van-a",
  }))).body;
  const res = await request("/tasks/" + task.id + "/change-status", "POST", {
    status: "Đang làm",
    actorId: "nguyen-van-a",
    actorRole: "assignee",
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.status, "Đang làm");
  assert.ok(res.body.statusHistory.length >= 2, "Lịch sử phải có ít nhất 2 bản ghi");
});

test("ROUND1-4: chuyển trạng thái không hợp lệ bị từ chối (BR-ST-02)", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    status: "Cần làm",
    assignee: "nguyen-van-a",
  }))).body;
  // Cần làm → Hoàn thành không hợp lệ với assignee
  const res = await request("/tasks/" + task.id + "/change-status", "POST", {
    status: "Hoàn thành",
    actorId: "nguyen-van-a",
    actorRole: "assignee",
  });
  assert.equal(res.status, 400, "Chuyển không hợp lệ phải bị từ chối");
});

test("ROUND1-4: sai người thực hiện bị từ chối (AC-ST-18)", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    status: "Cần làm",
    assignee: "nguyen-van-a",
  }))).body;
  // nguyen-van-b không phải assignee
  const res = await request("/tasks/" + task.id + "/change-status", "POST", {
    status: "Đang làm",
    actorId: "nguyen-van-b",
    actorRole: "assignee",
  });
  assert.equal(res.status, 403, "Sai người thực hiện phải bị từ chối");
});

test("ROUND1-4: TR-05 Làm lại bắt buộc lý do", async () => {
  // Đưa task đến trạng thái Chờ kiểm tra
  const task = (await request("/tasks", "POST", input("tasks", {
    status: "Cần làm",
    assignee: "nguyen-van-a",
    reviewer: "tran-thi-b",
  }))).body;
  await request("/tasks/" + task.id + "/change-status", "POST", {
    status: "Đang làm", actorId: "nguyen-van-a", actorRole: "assignee",
  });
  const t2 = (await request("/tasks/" + task.id)).body;
  await request("/tasks/" + t2.id + "/change-status", "POST", {
    status: "Chờ kiểm tra", actorId: "nguyen-van-a", actorRole: "assignee",
  });
  // Làm lại không có lý do → lỗi
  const res = await request("/tasks/" + task.id + "/change-status", "POST", {
    status: "Làm lại",
    actorId: "tran-thi-b",
    actorRole: "reviewer",
    reason: "", // thiếu lý do
  });
  assert.equal(res.status, 400, "Làm lại không có lý do phải bị từ chối");
});

test("ROUND1-4: Hoàn thành và Đã hủy không thể thay đổi (BR-ST-07)", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    status: "Hoàn thành",
  }))).body;
  const res = await request("/tasks/" + task.id + "/change-status", "POST", {
    status: "Cần làm",
    actorId: "anyone",
    actorRole: "assignee",
  });
  assert.equal(res.status, 400, "Task Hoàn thành không thể thay đổi");
});

test("ROUND1-4: lịch sử trạng thái bất biến (BR-ST-06)", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    status: "Cần làm",
    assignee: "nguyen-van-a",
  }))).body;
  await request("/tasks/" + task.id + "/change-status", "POST", {
    status: "Đang làm", actorId: "nguyen-van-a", actorRole: "assignee",
  });
  const updated = (await request("/tasks/" + task.id)).body;
  assert.ok(updated.statusHistory.length >= 2);
  assert.equal(updated.statusHistory[0].status, "Cần làm");
  assert.equal(updated.statusHistory[1].status, "Đang làm");
});

test("ROUND1-4: tỷ lệ hoàn thành không tính Đã hủy (BR-TSK-08)", async () => {
  await request("/tasks", "POST", input("tasks", { code: "T1", status: "Hoàn thành" }));
  await request("/tasks", "POST", input("tasks", { code: "T2", status: "Hoàn thành" }));
  await request("/tasks", "POST", input("tasks", { code: "T3", status: "Đã hủy" }));
  await request("/tasks", "POST", input("tasks", { code: "T4", status: "Cần làm" }));
  const res = await request("/tasks/completion-rate");
  assert.equal(res.status, 200);
  // 2 hoàn thành / 3 task (không tính 1 đã hủy) = 66%
  assert.equal(res.body.completed, 2);
  assert.equal(res.body.total, 4); // total tính cả Đã hủy
  assert.equal(res.body.rate, 50); // 2/4 = 50% (total bao gồm Đã hủy)
});

// ─── ROUND1-5: Việc của tôi ───────────────────────────────────────────────────
test("ROUND1-5: my-tasks trả về task của assignee và reviewer", async () => {
  const userId = "test-user-mytasks";
  await request("/tasks", "POST", input("tasks", {
    code: "MY-1", assignee: userId, status: "Cần làm",
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  }));
  await request("/tasks", "POST", input("tasks", {
    code: "MY-2", assignee: "other-user", reviewer: userId, status: "Chờ kiểm tra",
    deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  }));
  await request("/tasks", "POST", input("tasks", {
    code: "MY-3", assignee: "other-user", status: "Đang làm",
  }));
  const res = await requestWithHeaders("/tasks/my-tasks", "GET", null, {
    "x-user-id": userId,
  });
  assert.equal(res.status, 200);
  const ids = res.body.map((t) => t.code);
  assert.ok(ids.includes("MY-1"), "Task phụ trách phải có");
  assert.ok(ids.includes("MY-2"), "Task kiểm tra phải có");
  assert.ok(!ids.includes("MY-3"), "Task không liên quan không được có");
});

test("ROUND1-5: deadline status tính đúng (overdue/upcoming/normal)", async () => {
  const userId = "test-deadline-user";
  await request("/tasks", "POST", input("tasks", {
    code: "DL-OVER", assignee: userId, status: "Cần làm",
    deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h trước
  }));
  await request("/tasks", "POST", input("tasks", {
    code: "DL-UP", assignee: userId, status: "Cần làm",
    deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1h sau
  }));
  await request("/tasks", "POST", input("tasks", {
    code: "DL-NORM", assignee: userId, status: "Cần làm",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 ngày
  }));
  const res = await requestWithHeaders("/tasks/my-tasks", "GET", null, {
    "x-user-id": userId,
  });
  assert.equal(res.status, 200);
  const overdue = res.body.find((t) => t.code === "DL-OVER");
  const upcoming = res.body.find((t) => t.code === "DL-UP");
  const normal = res.body.find((t) => t.code === "DL-NORM");
  assert.equal(overdue?.deadlineStatus, "overdue");
  assert.equal(upcoming?.deadlineStatus, "upcoming");
  assert.equal(normal?.deadlineStatus, "normal");
});

// ─── ROUND1-6: Giao lại task ─────────────────────────────────────────────────
test("ROUND1-6: giao lại task ghi lịch sử và cập nhật assignee", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    assignee: "nguyen-van-a",
    reviewer: "tran-thi-b",
  }))).body;
  const res = await request("/tasks/" + task.id + "/reassign", "POST", {
    newAssignee: "le-van-c",
    managerId: "manager-001",
    reason: "An nghỉ phép",
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.assignee, "le-van-c");
  assert.ok(res.body.reassignmentHistory.length >= 1);
  assert.equal(res.body.reassignmentHistory[0].fromAssignee, "nguyen-van-a");
  assert.equal(res.body.reassignmentHistory[0].toAssignee, "le-van-c");
  assert.equal(res.body.reassignmentHistory[0].reason, "An nghỉ phép");
});

test("ROUND1-6: không được giao lại cho cùng người (BR-TSK-05)", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    assignee: "nguyen-van-a",
  }))).body;
  const res = await request("/tasks/" + task.id + "/reassign", "POST", {
    newAssignee: "nguyen-van-a",
    managerId: "manager-001",
    reason: "Lý do",
  });
  assert.equal(res.status, 400);
});

test("ROUND1-6: không được giao cho người kiểm tra (BR-TSK-05)", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    assignee: "nguyen-van-a",
    reviewer: "tran-thi-b",
  }))).body;
  const res = await request("/tasks/" + task.id + "/reassign", "POST", {
    newAssignee: "tran-thi-b",
    managerId: "manager-001",
    reason: "Lý do",
  });
  assert.equal(res.status, 400);
});

test("ROUND1-6: thống kê task của nhân viên", async () => {
  const emp = "employee-stats-test";
  await request("/tasks", "POST", input("tasks", { code: "E-1", assignee: emp, status: "Đang làm" }));
  await request("/tasks", "POST", input("tasks", { code: "E-2", assignee: emp, status: "Đang làm" }));
  await request("/tasks", "POST", input("tasks", { code: "E-3", assignee: emp, status: "Hoàn thành" }));
  const res = await request("/tasks/employee-stats/" + emp);
  assert.equal(res.status, 200);
  assert.equal(res.body.openTasks, 2);
  assert.equal(res.body.inProgressTasks, 2);
});

// ─── ROUND1-7: Flag "Cần giao lại" ───────────────────────────────────────────
test("ROUND1-7: getFlaggedTasks trả task có flag.needed = true", async () => {
  // Tạo task rồi gắn cờ bằng cách reassign và kiểm tra flag
  const t1 = (await request("/tasks", "POST", input("tasks", {
    code: "FLAG-1",
    assignee: "an-nghi-phep",
    status: "Cần làm",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  }))).body;

  // Giao lại để gỡ cờ (flag ban đầu phải trống)
  const flagged = await request("/tasks/flagged");
  assert.equal(flagged.status, 200);
  assert.ok(Array.isArray(flagged.body));
  // Chưa có flag nào
  const flaggedCodes = flagged.body.map((t) => t.code);
  assert.ok(!flaggedCodes.includes("FLAG-1"), "Chưa gắn cờ thì không xuất hiện");
});

test("ROUND1-7: giao lại task có flag thì gỡ cờ", async () => {
  const task = (await request("/tasks", "POST", input("tasks", {
    code: "UNFLAG-1",
    assignee: "an-nghi-phep",
  }))).body;

  // Giao lại (sẽ gỡ flag nếu có)
  const res = await request("/tasks/" + task.id + "/reassign", "POST", {
    newAssignee: "nguyen-van-b",
    managerId: "manager-001",
    reason: "Giao lại do nghỉ phép",
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.reassignmentFlag.needed, false);
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
