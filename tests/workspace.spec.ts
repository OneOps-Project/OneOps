import { admin, test, expect } from "./fixtures";

const routes = [
  "home",
  "tasks",
  "projects",
  "work-management/milestones",
  "work-management/timesheets",
  "calendar",
  "requests",
  "messages",
  "notes",
  "reports",
  "hr-management/attendance",
  "hr-management/workforce",
  "hr-management/explanations",
  "hr-management/shifts",
  "hr-management/attendance-reports",
  "hr-management/leaves",
  "hr-management/leave-approvals",
  "hr-management/capacity",
  "tenant-system/workflow-rules",
];
test("all work modules render, former modules return 404 and UI fits mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of routes) {
    expect((await page.goto("/" + route))?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator("img")
          .evaluateAll((images) =>
            (images as HTMLImageElement[])
              .filter((image) => !image.complete || image.naturalWidth === 0)
              .map((image) => image.src),
          ),
      )
      .toEqual([]);
    await expect(
      page
        .getByRole("navigation", { name: "Phân hệ", exact: true })
        .locator('a[aria-current="page"]'),
    ).toHaveCount(1);
  }
  for (const route of [
    "teams",
    "tenant-system/company-profile",
    "tenant-system/access-control/audit-backups",
    "manage-information",
    "book",
    "manage-receipt",
    "crm",
    "tenant-system/tenant-auth",
  ]) {
    expect((await page.goto("/" + route))?.status()).toBe(404);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/home");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(".page-footnote")).toContainText(
    "Tỷ lệ hoàn thành",
  );
  await page.screenshot({ path: "docs/screenshots/workspace-desktop.png" });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tasks");
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({ path: `docs/screenshots/tasks-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator(".page-footnote")).toContainText(
    "Tỷ lệ hoàn thành",
  );
  await page.screenshot({ path: "docs/screenshots/workspace-mobile.png" });
  expect(errors).toEqual([]);
});
test("a task moves through the workflow, keeps every reason and comment", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const lane = (name: string) =>
    page.getByRole("region", { name: new RegExp(`^${name} \\(`) });
  const card = () =>
    page.getByRole("button", { name: "Hoàn thiện workspace", exact: true });

  await page.goto("/work-management/kanban");
  await page
    .locator("main")
    .getByRole("button", { name: "Tạo mới", exact: true })
    .first()
    .click();
  let dialog = page.getByRole("dialog", { name: "Tạo mới" });
  await dialog.getByLabel("Mã", { exact: true }).fill("TASK-UI-01");
  await dialog
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Hoàn thiện workspace");
  // Only the assignee may start the work, so the actor owns the task.
  await dialog
    .getByLabel("Người thực hiện", { exact: true })
    .fill(admin.displayName);
  await dialog.getByLabel("Dự án", { exact: true }).fill("OneOps");
  await dialog.getByLabel("Mức ưu tiên").selectOption("Cao");
  await dialog.getByRole("button", { name: "Tạo mới", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    lane("Cần làm").getByRole("button", {
      name: "Hoàn thiện workspace",
      exact: true,
    }),
  ).toBeVisible();

  // The board only offers moves the workflow accepts for this actor.
  await page
    .getByLabel("Chuyển trạng thái TASK-UI-01", { exact: true })
    .selectOption("Đang làm");
  await expect(
    page.getByRole("status").filter({ hasText: "sang Đang làm" }),
  ).toBeVisible();
  await expect(
    lane("Đang làm").getByRole("button", {
      name: "Hoàn thiện workspace",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Chuyển trạng thái TASK-UI-01", { exact: true }),
  ).toHaveValue("Đang làm");
  await page.screenshot({ path: "docs/screenshots/tasks-kanban.png" });

  // The detail sheet drives the remaining moves; reasons are mandatory.
  await card().click();
  dialog = page.getByRole("dialog", { name: "Hoàn thiện workspace" });
  await dialog
    .getByRole("button", { name: "Gửi kiểm tra", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Yêu cầu làm lại", exact: true })
    .click();
  const reason = page.getByRole("dialog", { name: "Yêu cầu làm lại" });
  await reason.getByLabel("Lý do", { exact: true }).fill("Thiếu kiểm thử");
  await reason.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(reason).toHaveCount(0);
  const history = dialog.getByRole("list", { name: "Lịch sử trạng thái" });
  await expect(history).toContainText("TR-03");
  await expect(history).toContainText("TR-05");
  await expect(history).toContainText("Thiếu kiểm thử");
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();

  // Every reason is also stored as a system comment on the task.
  await card().click();
  dialog = page.getByRole("dialog", { name: "Hoàn thiện workspace" });
  await expect(dialog.getByText("[TR-05] Thiếu kiểm thử")).toBeVisible();
  await dialog.getByLabel("Thêm đầu việc").fill("Kiểm tra luồng tạo mới");
  await dialog.getByRole("button", { name: "Thêm", exact: true }).click();
  const item = dialog.getByRole("checkbox", {
    name: "Kiểm tra luồng tạo mới",
  });
  await item.check();
  await expect(item).toBeChecked();
  await dialog.getByLabel("Nội dung trao đổi").fill("Đã kiểm tra thành công");
  await dialog.getByRole("button", { name: "Gửi trao đổi" }).click();
  await expect(
    dialog.getByText("Đã kiểm tra thành công", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();

  // The list view keeps the same records and exposes row scoped actions.
  await page.getByRole("button", { name: "Danh sách", exact: true }).click();
  await page
    .getByRole("button", { name: "Sửa TASK-UI-01", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Chỉnh sửa công việc" });
  await edit
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Workspace hoàn chỉnh");
  await edit.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(edit).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Workspace hoàn chỉnh", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("tasks.csv");
  await page
    .getByRole("button", { name: "Xóa TASK-UI-01", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Xác nhận xóa" })
    .getByRole("button", { name: "Xóa", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Workspace hoàn chỉnh", exact: true }),
  ).toHaveCount(0);
});
test("a mandatory acceptance criterion blocks completion until a manager overrides it", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const project = await page.request.post("/api/v1/projects", {
    data: {
      code: "PRJ-01",
      name: "Dự án OneOps",
      date: "2026-12-31",
      status: "Lên kế hoạch",
      fields: {},
    },
  });
  expect(project.status(), await project.text()).toBe(201);
  const task = await page.request.post("/api/v1/tasks", {
    data: {
      code: "QA-01",
      name: "Bàn giao giai đoạn một",
      date: "2026-12-20",
      fields: {},
    },
  });
  expect(task.status(), await task.text()).toBe(201);

  await page.goto("/work-management/milestones");
  await page
    .getByRole("button", { name: "Tạo mốc", exact: true })
    .first()
    .click();
  let dialog = page.getByRole("dialog", { name: "Tạo mốc" });
  await dialog
    .getByLabel("Dự án")
    .selectOption({ label: "PRJ-01 · Dự án OneOps" });
  await dialog.getByLabel("Tên mốc").fill("Mốc bàn giao");
  await dialog.getByLabel("Ngày đích").fill("2026-12-31");
  await dialog.getByRole("button", { name: "Tạo mốc", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Mốc bàn giao/ }).click();

  dialog = page.getByRole("dialog", { name: "Mốc bàn giao" });
  await dialog
    .getByLabel("Gắn công việc")
    .selectOption({ label: "QA-01 · Bàn giao giai đoạn một" });
  await dialog.getByRole("button", { name: "Liên kết", exact: true }).click();
  await expect(dialog.getByText("QA-01")).toBeVisible();
  await dialog.getByRole("button", { name: "Kiểm tra QA-01" }).click();

  const qa = page.getByRole("dialog", { name: "Kiểm tra · QA-01" });
  await qa
    .getByLabel("Tiêu chí", { exact: true })
    .fill("Chạy thử toàn bộ luồng");
  await qa.getByRole("button", { name: "Thêm tiêu chí", exact: true }).click();
  await expect(qa.getByText("Bắt buộc").first()).toBeVisible();
  await expect(qa.getByText("Chưa kiểm tra").first()).toBeVisible();
  await qa.getByRole("button", { name: "Đóng", exact: true }).click();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();

  // The gate stops the reviewer; only the manager override with a reason lands.
  await page.goto("/work-management/kanban");
  await page
    .getByRole("button", { name: "Bàn giao giai đoạn một", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Bàn giao giai đoạn một" });
  await dialog
    .getByRole("button", { name: "Bắt đầu làm", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Gửi kiểm tra", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Xác nhận hoàn thành", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("tiêu chí kiểm tra");
  await dialog
    .getByRole("button", { name: "Bỏ qua kiểm tra và hoàn thành" })
    .click();
  const override = page.getByRole("dialog", {
    name: "Bỏ qua tiêu chí kiểm tra",
  });
  await override
    .getByLabel("Lý do bỏ qua", { exact: true })
    .fill("Đã kiểm tra thủ công cùng khách hàng");
  await override
    .getByRole("button", { name: "Hoàn thành", exact: true })
    .click();
  await expect(override).toHaveCount(0);
  const history = dialog.getByRole("list", { name: "Lịch sử trạng thái" });
  await expect(history).toContainText("TR-04");
  await expect(history).toContainText("Đã kiểm tra thủ công");
});
test("a week of timesheet entries submits itself when it stays under the threshold", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/work-management/timesheets");
  await page
    .getByRole("button", { name: "Mở tuần", exact: true })
    .first()
    .click();
  let dialog = page.getByRole("dialog", { name: "Mở tuần công" });
  await dialog.getByRole("button", { name: "Mở tuần", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Mở", exact: true }).click();

  dialog = page.getByRole("dialog", { name: /^Tuần / });
  await dialog.getByRole("button", { name: "Thêm dòng", exact: true }).click();
  await expect(dialog.getByText("8h").first()).toBeVisible();
  await dialog
    .getByRole("button", { name: "Gửi tuần này", exact: true })
    .click();
  await expect(dialog.getByText("Đã duyệt").first()).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Gửi tuần này", exact: true }),
  ).toHaveCount(0);
});
test("global creation switches module without leaking form state; calendar renders its event", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "Tạo mới", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Tạo mới" });
  await dialog.getByLabel("Mã", { exact: true }).fill("RESET-ME");
  await dialog
    .getByRole("combobox", { name: "Phân hệ", exact: true })
    .selectOption("work-management/calendar");
  await expect(dialog.getByLabel("Mã", { exact: true })).toHaveValue("");
  await dialog.getByLabel("Mã", { exact: true }).fill("MEET-01");
  await dialog.getByLabel("Tiêu đề", { exact: true }).fill("Họp kế hoạch tuần");
  await dialog.getByLabel("Bắt đầu", { exact: true }).fill("09:00");
  await dialog.getByLabel("Kết thúc", { exact: true }).fill("10:00");
  await dialog.getByRole("button", { name: "Tạo mới", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Đã tạo thành công");
  await page.goto("/calendar");
  await expect(
    page.getByRole("button", { name: "09:00 Họp kế hoạch tuần", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "09:00 Họp kế hoạch tuần", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Họp kế hoạch tuần");
  await page.keyboard.press("Escape");
  await page.goto("/projects");
  await expect(
    page.getByRole("button", { name: "Họp kế hoạch tuần", exact: true }),
  ).toHaveCount(0);
});
