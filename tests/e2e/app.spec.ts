import { expect, test } from "@playwright/test";

test("connect wallet and submit event flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();

  await page.goto("/events");
  await page.getByRole("button", { name: "Connect Wallet" }).click();
  await page.getByRole("button", { name: "Mock Zedra" }).click();

  await page.getByRole("button", { name: "Open form" }).click();

  await page.getByLabel("Title").fill("E2E Event");
  await page
    .getByLabel("Description")
    .fill("This event was created by Playwright end-to-end tests.");
  await page.locator("#category").fill("Testing");
  await page.getByLabel("Start date/time").fill("2026-03-05T10:00");
  await page.getByLabel("End date/time").fill("2026-03-05T12:00");

  await page.getByRole("button", { name: "Submit Event Request" }).click();

  await expect(page.getByText("Event request submitted.")).toBeVisible();

  await page.getByRole("link", { name: "My Events" }).click();
  await expect(page.getByRole("heading", { name: "Pending Submissions" })).toBeVisible();
  await expect(page.getByText("E2E Event")).toBeVisible();

  await page
    .locator("article")
    .filter({ hasText: "E2E Event" })
    .getByRole("button", { name: "Cancel Pending" })
    .click();
  await expect(page.getByText("Pending event cancelled.")).toBeVisible();
});

test("network mismatch blocks write actions", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nova_mock_network_mismatch", "1");
  });

  await page.goto("/events");
  await page.getByRole("button", { name: "Connect Wallet" }).click();
  await page.getByRole("button", { name: "Mock Zedra" }).click();

  await expect(
    page.getByText("Wallet network mismatch. Switch to Cedra Testnet")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open form" })).toBeDisabled();

  await page.evaluate(() => {
    localStorage.removeItem("nova_mock_network_mismatch");
  });
});

test("games and privacy pages render", async ({ page }) => {
  await page.goto("/games");
  await expect(page.getByRole("heading", { name: "Nova Games" })).toBeVisible();

  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy for Nova Wallet" })
  ).toBeVisible();
});
