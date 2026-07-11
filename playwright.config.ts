import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev -- -p 3011",
    url: "http://127.0.0.1:3011",
    reuseExistingServer: false
  },
  use: {
    baseURL: "http://127.0.0.1:3011",
    trace: "on-first-retry"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
