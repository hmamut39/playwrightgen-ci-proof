import { defineConfig } from "@playwright/test";

/**
 * Configured so a failing test leaves evidence behind.
 *
 * The defaults keep almost nothing, which is fine locally and useless in CI:
 * the runner is destroyed when the job ends, so anything not written to disk
 * and uploaded is gone. These three settings are what make a trace, screenshot
 * and video exist for PlaywrightGen to attach to the failed attempt.
 *
 * baseURL comes from the environment because this repository has no site of
 * its own. Without it a relative navigation fails with "Cannot navigate to
 * invalid URL", which is what happened here on every run from 2026-09-07; the
 * test now skips rather than failing when it is unset.
 */
export default defineConfig({
  testDir: "./tests",
  reporter: "json",
  outputDir: "test-results",
  use: {
    baseURL: process.env.TEST_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
