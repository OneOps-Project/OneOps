import { test, expect } from "./fixtures";
import { testAdmin } from "../apps/api/test/identity.mjs";
test("accounts UI creates a linked profile and account, changes role, resets password and locks/unlocks with history", async ({
  page,
}) => {
  await page.goto("/tenant-system/accounts");
  await expect(
    page.getByRole("heading", { name: "Quản lý tài khoản", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tạo hồ sơ nhân viên", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Mã nhân viên", { exact: true }).fill("UI-EMP");
  await dialog
    .getByLabel("Họ tên", { exact: true })
    .fill("Nhân viên giao diện");
  await dialog
    .getByLabel("Email công việc", { exact: true })
    .fill("ui-employee@example.test");
  await dialog.getByRole("button", { name: "Tạo hồ sơ", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Hồ sơ nhân viên", { exact: true }).selectOption({
    label: "UI-EMP · Nhân viên giao diện (ui-employee@example.test)",
  });
  await dialog.getByLabel("Tên đăng nhập", { exact: true }).fill("ui-employee");
  await dialog
    .getByLabel("Mật khẩu ban đầu", { exact: true })
    .fill("UI-employee-password-123");
  await dialog
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const row = page
    .getByRole("row")
    .filter({ hasText: "ui-employee@example.test" });
  await expect(row).toBeVisible();
  await page.screenshot({ path: "/tmp/oneops-accounts-desktop.png" });
  await row.getByRole("button", { name: "Sửa", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên đăng nhập", { exact: true }).fill("ui-renamed");
  await dialog
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText("@ui-renamed");
  await row.getByRole("button", { name: "Vai trò", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Vai trò mới", exact: true })
    .selectOption("MANAGER");
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText("Quản lý");
  await row
    .getByRole("button", { name: "Quyền quản trị", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("checkbox", { name: "Cho phép quản trị tài khoản" })
    .check();
  await dialog
    .getByRole("button", { name: "Xác nhận quyền", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await row
    .getByRole("button", { name: "Đặt lại mật khẩu", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Mật khẩu mới", { exact: true })
    .fill("UI-replacement-password-456");
  await dialog
    .getByLabel("Xác nhận mật khẩu", { exact: true })
    .fill("UI-replacement-password-456");
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await row.getByRole("button", { name: "Khóa", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do", { exact: true }).fill("Nhân sự nghỉ việc");
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText("Đã khóa");
  await row.getByRole("button", { name: "Mở khóa", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do", { exact: true }).fill("Quay lại làm việc");
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText("Hoạt động");
  await row.getByRole("button", { name: "Lịch sử", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Đặt lại mật khẩu", { exact: true }),
  ).toBeVisible();
  await expect(dialog).not.toContainText("UI-replacement-password-456");
  await dialog
    .getByRole("button", { name: "Đóng hộp thoại", exact: true })
    .click();
  await page
    .getByLabel("Tìm kiếm tài khoản", { exact: true })
    .fill("not-found-user");
  await expect(page.getByText("Không có tài khoản phù hợp.")).toBeVisible();
});
test("account groups can be created and edited with owner, members and history; UI fits mobile and dark compact", async ({
  page,
  context,
}) => {
  const request = context.request;
  const employee = await (
    await request.post("/api/v1/employees", {
      data: {
        code: "GROUP-EMP",
        name: "Thành viên nhóm",
        email: "group-employee@example.test",
      },
    })
  ).json();
  await request.post("/api/v1/accounts", {
    data: {
      employeeId: employee.id,
      username: "group-employee",
      email: employee.email,
      role: "EMPLOYEE",
      password: "Group-employee-password-123",
    },
  });
  await page.goto("/tenant-system/accounts?view=groups");
  await page.getByRole("button", { name: "Tạo nhóm", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên nhóm", { exact: true }).fill("Ban điều hành");
  await dialog.getByLabel("Directory", { exact: true }).fill("ban-dieu-hanh");
  await dialog
    .getByRole("combobox", { name: "Người sở hữu", exact: true })
    .selectOption({ label: `Quản trị kiểm thử (@${testAdmin.username})` });
  await dialog
    .getByRole("checkbox", {
      name: "Thành viên nhóm (@group-employee)",
      exact: true,
    })
    .check();
  await dialog.getByRole("button", { name: "Lưu nhóm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const row = page.getByRole("row").filter({ hasText: "ban-dieu-hanh" });
  await expect(row).toContainText("2");
  await row.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Tên nhóm", { exact: true })
    .fill("Ban điều hành mới");
  await dialog.getByRole("button", { name: "Lưu nhóm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText("Ban điều hành mới");
  await row.getByRole("button", { name: "Lịch sử", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Cập nhật nhóm", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Đóng hộp thoại", exact: true })
    .click();
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.density = "compact";
  });
  const colors = await page
    .getByLabel("Tìm kiếm nhóm", { exact: true })
    .evaluate((element) => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--surface)";
      document.body.append(probe);
      const result = {
        input: getComputedStyle(element).backgroundColor,
        surface: getComputedStyle(probe).backgroundColor,
      };
      probe.remove();
      return result;
    });
  await expect
    .poll(() =>
      page
        .getByLabel("Tìm kiếm nhóm", { exact: true })
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe(colors.surface);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/oneops-accounts-dark-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
test("a manager without administration permission sees access denied and cannot call protected APIs", async ({
  page,
  context,
}) => {
  const request = context.request;
  const profile = await (
    await request.post("/api/v1/employees", {
      data: {
        code: "LIMITED",
        name: "Quản lý thông thường",
        email: "limited@example.test",
      },
    })
  ).json();
  await request.post("/api/v1/accounts", {
    data: {
      employeeId: profile.id,
      username: "limited-manager",
      email: profile.email,
      role: "MANAGER",
      password: "Limited-manager-password-123",
    },
  });
  await context.clearCookies();
  await page.goto("/tenant-system/accounts");
  await page
    .getByLabel("Tên đăng nhập hoặc email", { exact: true })
    .fill("limited-manager");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Limited-manager-password-123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Không có quyền quản trị tài khoản" }),
  ).toBeVisible();
  expect((await context.request.get("/api/v1/accounts")).status()).toBe(403);
});
