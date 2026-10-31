import { test, expect } from "./fixtures";

test("an automation rule is created, dry ran, paused and removed", async ({
  page,
}) => {
  await page.goto("/tenant-system/workflow-rules");
  await expect(page.locator("main h1")).toHaveText("Quy tắc tự động");
  await expect(page.getByText("Chưa có quy tắc nào")).toBeVisible();

  await page.getByRole("button", { name: "Tạo quy tắc" }).click();
  await page.getByLabel("Tên quy tắc").fill("Nhắc khi sang Chờ kiểm tra");
  await page
    .getByLabel("Mô tả")
    .fill("Báo cho quản lý khi công việc vào bước kiểm tra");
  await page.getByRole("button", { name: "Lưu quy tắc" }).click();

  const card = page.locator("article", {
    hasText: "Nhắc khi sang Chờ kiểm tra",
  });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Khi cập nhật");
  await expect(card.getByText("Đang bật", { exact: true })).toBeVisible();

  // The dry run reports the rule and its compiled actions; no task is written.
  await page
    .getByRole("button", { name: "Chạy thử", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Chạy thử", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("1 quy tắc khớp với sự kiện đã chọn"),
  ).toBeVisible();
  await expect(page.getByText("Khớp", { exact: true })).toBeVisible();

  // Pausing keeps the rule in place but out of the evaluation.
  await page
    .getByRole("button", { name: "Quy tắc", exact: true })
    .first()
    .click();
  await card.getByRole("button", { name: "Tắt", exact: true }).click();
  await expect(card.getByText("Đang tắt", { exact: true })).toBeVisible();

  await card.getByRole("button", { name: "Xóa", exact: true }).click();
  await card.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(page.getByText("Chưa có quy tắc nào")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tenant-system/workflow-rules");
  await expect(page.locator("main h1")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
