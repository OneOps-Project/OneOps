import { test, expect } from "./fixtures";
test("token studio resolves theme/density, filters tokens and exports complete profiles", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/design-tokens");
  await expect(
    page.getByRole("heading", { name: "Design tokens", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Tìm design token", exact: true })
    .fill("button-height");
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(page.getByRole("row").last()).toContainText("40px");
  await page
    .getByRole("button", { name: "Đổi mật độ hiển thị", exact: true })
    .click();
  await expect(page.getByRole("row").last()).toContainText("34px");
  await page
    .getByRole("textbox", { name: "Tìm design token", exact: true })
    .fill("button-bg");
  await expect(page.getByRole("row").last()).toContainText("#bd4600");
  await page
    .getByRole("button", { name: "Đổi giao diện sáng tối", exact: true })
    .click();
  await expect(page.getByRole("row").last()).toContainText("#ffad6b");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Tải cấu hình hiện tại", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "oneops-dark-compact.tokens.json",
  );
  const response = await page.request.get("/tokens/dark-compact.json");
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  const names = Object.keys(json.tokens);
  expect(names).toHaveLength(233);
  expect(json.tokens["button-height"]).toBe("34px");
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Lọc lớp token", exact: true })
    .selectOption("component");
  await expect(page.getByRole("row")).not.toHaveCount(names.length + 1);
  await page
    .getByRole("textbox", { name: "Tìm design token", exact: true })
    .fill("not-a-real-token");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy token", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await page
    .getByRole("button", { name: "Đổi giao diện sáng tối", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Đổi mật độ hiển thị", exact: true })
    .click();
  await page.screenshot({ path: "docs/screenshots/design-tokens-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator("main")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBe(false);
  await page.screenshot({ path: "docs/screenshots/design-tokens-mobile.png" });
  expect(errors).toEqual([]);
});
