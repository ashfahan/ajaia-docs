import { defineConfig, devices } from "@playwright/test"

// E2E config. By default it boots the dev server on localhost:3000 and runs
// against it; set E2E_BASE_URL to point at a deployed URL instead
// (e.g. E2E_BASE_URL=https://ajaia-docs-psi.vercel.app npm run test:e2e).
// Requires Supabase env vars (.env.local) when running the local server, and
// the seeded users from supabase/schema.sql.
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
