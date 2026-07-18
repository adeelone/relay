import { expect, test } from "@playwright/test";

test("dashboard renders submit and queue health", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Operations dashboard" }),
  ).toBeVisible();
  await expect(page.getByText("Submit a job")).toBeVisible();
  await expect(page.getByText("Queue health")).toBeVisible();
});
