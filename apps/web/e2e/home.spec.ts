import { expect, test } from "@playwright/test";

test("views the table and simulates a match", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /football, forward/i })).toBeVisible();
  await expect(
    page.getByRole("table", { name: /current premier league standings/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /season workspace/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simulate MW 1" })).toBeEnabled();
  await page.getByRole("button", { name: "Simulate match" }).click();
  await expect(page.getByText(/sampled result/i)).toBeVisible();
});
