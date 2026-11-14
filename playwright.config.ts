import { defineConfig } from "@playwright/test";

/* The editor-cost journey runs against a page that hosts the editor: by default the one in e2e/host, built from THIS
   branch's package (run `pnpm build` first). Point BUILDER_BASE_URL at another host (the live Krizaka UI site's
   /builder page) to measure what is published instead. */
const HOST_PORT = Number(process.env.BUILDER_HOST_PORT ?? 4173);
const ownHost = !process.env.BUILDER_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  timeout: 150_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  webServer: ownHost
    ? {
        command: "node e2e/host/serve.mjs",
        url: `http://127.0.0.1:${HOST_PORT}/fr/builder`,
        reuseExistingServer: false,
        timeout: 60_000,
      }
    : undefined,
  use: {
    baseURL: process.env.BUILDER_BASE_URL ?? `http://127.0.0.1:${HOST_PORT}`,
    browserName: "chromium",
    reducedMotion: "reduce",
    actionTimeout: 10_000,
    screenshot: "only-on-failure",
  },
});
