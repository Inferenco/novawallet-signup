import { expect, test } from "@playwright/test";

test("connect wallet and submit event flow", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("nova_mock_network_mismatch");
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();

  if (isMobile) {
    await page.getByRole("button", { name: "Toggle menu" }).click();
  }
  await page.goto("/events");
  await page.getByRole("button", { name: "Connect" }).click();
  await page.getByRole("button", { name: "Mock Zedra" }).click();

  await page.getByRole("button", { name: "Start Event Submission" }).click();

  await page.getByLabel("Title").fill("E2E Event");
  await page
    .getByLabel("Description")
    .fill("This event was created by Playwright end-to-end tests.");
  await page.locator("#category").fill("Testing");
  await page.getByLabel("Start date/time").fill("2026-03-05T10:00");
  await page.getByLabel("End date/time").fill("2026-03-05T12:00");

  await page.getByRole("button", { name: "Submit Event Request" }).click();

  await expect(page.getByText("Event request submitted.")).toBeVisible();

  if (isMobile) {
    await page.getByRole("button", { name: "Toggle menu" }).click();
  }
  await page.getByRole("link", { name: "My Events" }).click();
  await expect(page.getByRole("heading", { name: "Pending Submissions" })).toBeVisible();
  await expect(page.getByText("E2E Event")).toBeVisible();

  const e2ePendingHeader = page.getByRole("heading", { name: "E2E Event" });
  await e2ePendingHeader
    .locator("xpath=../..")
    .getByRole("button", { name: "Cancel Pending" })
    .click();
  await expect(page.getByText("Pending event cancelled.")).toBeVisible();
});

test("network mismatch blocks write actions", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("nova_mock_network_mismatch", "1");
  });

  if (isMobile) {
    await page.getByRole("button", { name: "Toggle menu" }).click();
  }
  await page.goto("/events");
  await page.getByRole("button", { name: "Connect" }).click();
  await page.getByRole("button", { name: "Mock Zedra" }).click();

  await expect(
    page.getByText(/Network mismatch\. Switch to Cedra Testnet/i)
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Event Submission" })).toBeDisabled();

  await page.evaluate(() => {
    localStorage.removeItem("nova_mock_network_mismatch");
  });
});

test("games routes and privacy pages render", async ({ page }) => {
  await page.goto("/games");
  await expect(page.getByRole("heading", { name: "Nova Gaming" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Nova Casino/i })).toBeVisible();

  await page.goto("/games/casino");
  await expect(page.getByText("Connect your wallet to claim chips")).toBeVisible();

  await page.goto("/games/poker");
  await expect(page.getByRole("heading", { name: "Poker Lobby" })).toBeVisible();

  await page.goto("/games/poker/tables");
  await expect(page.getByText("Poker Tables", { exact: true })).toBeVisible();

  await page.goto("/games/poker/create");
  await expect(page.getByRole("heading", { name: "Create Poker Table" })).toBeVisible();

  await page.goto("/games/poker/0xabc");
  await expect(page.getByText("Missing table address.")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Events" })).toHaveCount(0);

  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy for Nova Wallet" })
  ).toBeVisible();
});
