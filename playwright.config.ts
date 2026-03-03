import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  webServer: {
    command:
      "VITE_MOCK_CHAIN=true VITE_MOCK_WALLET=true npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI
  },
  projects: isCI
    ? [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] }
        },
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] }
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] }
        },
        {
          name: "mobile-iphone",
          use: { ...devices["iPhone 14"] }
        },
        {
          name: "mobile-android",
          use: { ...devices["Pixel 7"] }
        }
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] }
        }
      ]
});
