/**
 * @jest-environment node
 */
import { build } from "esbuild";
import path from "path";
import os from "os";
import fs from "fs";
import { cssModulePlugin } from "../../tsup-config/css-module-plugin";

describe("cssModulePlugin", () => {
  it("does not embed absolute paths in bundled output", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "css-module-plugin-test-")
    );

    try {
      fs.writeFileSync(
        path.join(tmpDir, "Button.module.css"),
        ".button { color: red; }"
      );
      fs.writeFileSync(
        path.join(tmpDir, "index.ts"),
        'import styles from "./Button.module.css"; export default styles;'
      );

      const outDir = path.join(tmpDir, "out");
      fs.mkdirSync(outDir);

      await build({
        entryPoints: [path.join(tmpDir, "index.ts")],
        bundle: true,
        format: "esm",
        outdir: outDir,
        plugins: [cssModulePlugin],
        absWorkingDir: tmpDir,
        logLevel: "silent",
      });

      const files = fs.readdirSync(outDir);
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const content = fs.readFileSync(path.join(outDir, file), "utf8");
        // The namespace key must be relative — never an absolute path
        expect(content).not.toMatch(/css-module:\//);
        expect(content).not.toContain("/Users/");
        expect(content).not.toContain("/home/");
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 15000);
});
