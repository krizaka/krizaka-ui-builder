import { defineConfig } from "@playwright/test";

/* The editor-cost journey runs against a page that hosts the editor. This repository has no demo app, so the default is
   the live Krizaka UI site's /builder page; point BUILDER_BASE_URL at a local build of the site to measure a branch. */
export default defineConfig({
  testDir: "e2e",
  timeout: 150_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BUILDER_BASE_URL ?? "https://ui.krizaka.com",
    browserName: "chromium",
    reducedMotion: "reduce",
    actionTimeout: 10_000,
  },
});
