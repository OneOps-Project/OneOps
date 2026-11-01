import { test, expect } from "./fixtures";
import { testAdmin } from "../apps/api/test/identity.mjs";
async function createAccount(
  request: import("@playwright/test").APIRequestContext,
  suffix: string,
  role = "EMPLOYEE",
) {
  const profileResponse = await request.post("/api/v1/employees", {
    data: {
      code: `AUDIT-${suffix.toUpperCase()}`,
      name: `Nhân viên ${suffix}`,
      email: `${suffix}@example.test`,
    },
  });
  expect(profileResponse.status()).toBe(201);
  const employee = await profileResponse.json();
  const response = await request.post("/api/v1/accounts", {
    data: {
      employeeId: employee.id,
      username: `audit-${suffix}`,
      email: employee.email,
      role,
      password: "Audit-ui-password-123",
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}
test("central audit searches account events, combines filters and opens masked event details", async ({
  page,
  context,
}) => {
  const account = await createAccount(context.request, "search");
  const changed = await context.request.patch(
    `/api/v1/accounts/${account.id}`,
    {
      data: {
        username: "audit-search-renamed",
        email: account.email,
        version: account.version,
      },
    },
  );
  expect(changed.status()).toBe(200);
  const updated = await changed.json();
  expect(
    (
      await context.request.post(`/api/v1/accounts/${account.id}/role`, {
        data: { role: "MANAGER", version: updated.version },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/tenant-system/checklog");
  await expect(
    page.getByRole("heading", { name: "Nhật ký hệ thống", exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table", { name: "Danh sách sự kiện nhật ký" });
  await expect(table.getByRole("row")).toHaveCount(4);
  await page.screenshot({ path: "/tmp/oneops-checklog-desktop.png" });
  await page
    .getByRole("combobox", { name: "Module", exact: true })
    .selectOption("tenant-system/access-control/accounts");
  await page
    .getByLabel("Người thực hiện", { exact: true })
    .fill(testAdmin.username);
  await page
    .getByRole("combobox", { name: "Hành động", exact: true })
    .selectOption("account.role-changed");
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(table).toContainText("Thay đổi vai trò");
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(table.getByRole("row")).toHaveCount(4);
  await page.getByLabel("ID đối tượng", { exact: true }).fill(account.id);
  await page
    .getByRole("combobox", { name: "Loại đối tượng", exact: true })
    .selectOption("account");
  await page
    .getByRole("combobox", { name: "Hành động", exact: true })
    .selectOption("account.created");
  await expect(table.getByRole("row")).toHaveCount(2);
  await table.getByRole("button", { name: /Xem chi tiết/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Nội dung thay đổi" }),
  ).toBeVisible();
  await expect(dialog).toContainText("Tạo tài khoản");
  await expect(dialog).toContainText("s***@example.test");
  await expect(dialog).not.toContainText("search@example.test");
  await expect(dialog).not.toContainText("Audit-ui-password-123");
  await expect(dialog.getByRole("button", { name: /Sửa|Xóa/ })).toHaveCount(0);
  const changesTable = dialog.getByRole("table");
  expect(
    await changesTable.evaluate((element) => {
      const container = element.parentElement!;
      return container.scrollWidth <= container.clientWidth + 1;
    }),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/oneops-checklog-detail.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Kết quả", exact: true })
    .selectOption("FAILURE");
  await expect(
    page.getByText("Không có sự kiện phù hợp với bộ lọc."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await page.getByLabel("Từ ngày", { exact: true }).fill("2026-10-31");
  await page.getByLabel("Đến ngày", { exact: true }).fill("2026-10-01");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc." })
      .first(),
  ).toBeVisible();
});
test("an account administrator cannot access central audit data through UI or direct API", async ({
  page,
  context,
}) => {
  const account = await createAccount(context.request, "restricted", "MANAGER");
  expect(
    (
      await context.request.post("/api/v1/account-permissions", {
        data: { accountId: account.id, manageAccounts: true },
      })
    ).status(),
  ).toBe(201);
  const login = await context.request.post("/api/v1/auth/login", {
    data: { username: account.username, password: "Audit-ui-password-123" },
  });
  expect(login.status()).toBe(201);
  await page.goto("/tenant-system/checklog");
  await expect(
    page.getByRole("heading", {
      name: "Không có quyền xem nhật ký tập trung",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  expect((await context.request.get("/api/v1/checklog")).status()).toBe(403);
  expect((await context.request.get("/api/v1/checklog/filters")).status()).toBe(
    403,
  );
});
test("audit navigation, keyboard details, dark compact colors and mobile layout stay usable", async ({
  page,
  context,
}) => {
  await createAccount(context.request, "mobile");
  await page.goto("/tenant-system/checklog");
  const table = page.getByRole("table", { name: "Danh sách sự kiện nhật ký" });
  await expect(table.getByRole("row")).toHaveCount(2);
  const detail = table.getByRole("button", { name: /Xem chi tiết/ });
  await detail.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(detail).toBeFocused();
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.density = "compact";
  });
  const surface = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--surface)";
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
  await expect
    .poll(() =>
      page
        .getByLabel("Tìm kiếm", { exact: true })
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe(surface);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({ path: "/tmp/oneops-checklog-dark-mobile.png" });
  await page.goto("/tenant-system/checklog?result=DENIED");
  await expect(
    page.getByText("Không có sự kiện phù hợp với bộ lọc."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Danh sách sự kiện nhật ký" }),
  ).toBeVisible();
});
