import { test, expect } from "./fixtures";

test("hướng dẫn nhanh đi qua bốn bước, nhớ đã xem và luôn mở lại được", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();

  await page.getByRole("button", { name: "Xem hướng dẫn sử dụng" }).click();
  const tour = page.getByRole("dialog");
  await expect(tour).toBeVisible();
  await expect(tour.getByRole("heading", { level: 2 })).toHaveText(
    "Điều hướng theo phân hệ",
  );
  await expect(tour).toContainText("Bước 1/4");
  // Chờ hiệu ứng vào xong để đo vị trí và chụp ảnh ở trạng thái ổn định.
  await tour.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );

  const box = await tour.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }
  await page.screenshot({ path: "docs/screenshots/onboarding-tour.png" });

  await tour.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(tour.getByRole("heading", { level: 2 })).toHaveText(
    "Tìm mọi chức năng bằng Ctrl K",
  );
  await page.keyboard.press("ArrowRight");
  await expect(tour).toContainText("Bước 3/4");
  await page.keyboard.press("ArrowLeft");
  await expect(tour).toContainText("Bước 2/4");

  await tour.getByRole("button", { name: "Quay lại" }).click();
  await expect(tour).toContainText("Bước 1/4");

  await page.keyboard.press("Escape");
  await expect(tour).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem("oneops.onboarding.v1")),
  ).toBe("seen");

  // Hướng dẫn không tự bật lại nhưng luôn gọi được từ widget trang chủ.
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Xem hướng dẫn 4 bước" }).click();
  await expect(page.getByRole("dialog")).toContainText("Bước 1/4");
  for (let step = 1; step < 4; step += 1)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Tiếp tục" })
      .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hoàn tất" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();

  expect(errors).toEqual([]);
});
