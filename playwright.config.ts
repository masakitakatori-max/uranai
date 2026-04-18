import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && node scripts/assemble-pages-site.mjs && npx serve site-build -l 4173 --no-request-logging",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
