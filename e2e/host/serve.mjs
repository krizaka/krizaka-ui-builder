// Builds the host page against the branch's own build of the package (packages/core/dist) and serves it on 4173,
// whatever the path (/fr/builder). Run `pnpm build` first.
import { build } from "esbuild";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const out = join(here, ".dist");
const PORT = Number(process.env.BUILDER_HOST_PORT ?? 4173);

await mkdir(out, { recursive: true });
await build({
  entryPoints: [join(here, "main.tsx")],
  outfile: join(out, "main.js"),
  bundle: true,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "@krizaka/ui-builder": join(root, "packages/core/dist/index.mjs"),
  },
  logLevel: "warning",
});
await copyFile(
  join(root, "packages/core/dist/index.css"),
  join(out, "puck.css")
);
await copyFile(join(here, "theme.css"), join(out, "theme.css"));
await copyFile(join(here, "index.html"), join(out, "index.html"));

const ASSETS = new Set(["/main.js", "/puck.css", "/theme.css"]);
const TYPES = { ".js": "text/javascript", ".css": "text/css" };
createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  const asset = ASSETS.has(path) ? path : "/index.html";
  const ext = asset.slice(asset.lastIndexOf("."));
  res.setHeader("content-type", TYPES[ext] ?? "text/html; charset=utf-8");
  res.end(await readFile(join(out, asset)));
}).listen(PORT, "127.0.0.1", () => console.log(`builder host on :${PORT}`));
