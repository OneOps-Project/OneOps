import { test, expect, admin } from "./fixtures";

const temporary = "mat-khau-tam-1";
const renewed = "mat-khau-moi-2";

test("sessions gate the app, reject wrong passwords and force the first change", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();

  const created = await page.request.post("/api/v1/accounts", {
    data: {
      username: "nhan.vien.moi",
      displayName: "Lê Nhân Viên Mới",
      role: "EMPLOYEE",
      password: temporary,
      actorName: admin.displayName,
    },
  });
  expect(created.status(), await created.text()).toBe(201);

  await page.goto("/tenant-system/auth");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Đang đăng nhập",
  );
  await page.getByRole("button", { name: "Vào không gian làm việc" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "Thông tin phiên làm việc" }).click();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/tenant-system\/auth$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Đăng nhập OneOps",
  );

  await page.goto("/tasks");
  await expect(page).toHaveURL(/\/tenant-system\/auth$/);

  await page.getByLabel("Tên đăng nhập").fill("nhan.vien.moi");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("sai-mat-khau");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Tên đăng nhập hoặc mật khẩu không đúng.",
  );
  // Ảnh bàn giao cho trạng thái lỗi trên bố cục đăng nhập mới.
  await page.screenshot({ path: "docs/screenshots/auth-desktop.png" });

  await page.getByLabel("Mật khẩu", { exact: true }).fill(temporary);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Đổi mật khẩu lần đầu",
  );

  // The forced change keeps every other route closed.
  await page.goto("/work-management/tasks");
  await expect(page).toHaveURL(/\/tenant-system\/auth$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Đổi mật khẩu lần đầu",
  );

  await page.getByLabel("Mật khẩu hiện tại").fill(temporary);
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(renewed);
  await page.getByLabel("Nhập lại mật khẩu mới").fill(`${renewed}-sai`);
  await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Mật khẩu nhập lại không khớp.",
  );

  await page.getByLabel("Nhập lại mật khẩu mới").fill(renewed);
  await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Thông tin phiên làm việc" }).click();
  await expect(page.getByText("Lê Nhân Viên Mới")).toBeVisible();
  await expect(page.getByText("Nhân viên", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
