import fs from "fs";
import path from "path";
import postcss from "postcss";
import postcssModules from "postcss-modules";
import type { Plugin } from "esbuild";

export const cssModulePlugin: Plugin = {
  name: "css-module",
  setup(build) {
    const pkgRoot = build.initialOptions.absWorkingDir ?? process.cwd();

    build.onResolve({ filter: /\.module\.css$/, namespace: "file" }, (args) => {
      const absPath = path.join(args.resolveDir, args.path);
      return {
        path: `${path.relative(pkgRoot, absPath)}#css-module`,
        namespace: "css-module",
        pluginData: { pathDir: absPath },
      };
    });
    build.onLoad(
      { filter: /#css-module$/, namespace: "css-module" },
      async (args) => {
        const { pluginData } = args as {
          pluginData: { pathDir: string };
        };

        const source = fs.readFileSync(pluginData.pathDir, "utf8");

        let cssModule = {};
        const result = await postcss([
          postcssModules({
            getJSON(_, json) {
              cssModule = json;
            },
          }),
        ]).process(source, { from: pluginData.pathDir });

        return {
          pluginData: { css: result.css },
          resolveDir: pkgRoot,
          contents: `import "${path.relative(
            pkgRoot,
            pluginData.pathDir
          )}"; export default ${JSON.stringify(cssModule)}`,
        };
      }
    );
    build.onResolve(
      { filter: /\.module\.css$/, namespace: "css-module" },
      (args) => ({
        path: `${path.relative(
          pkgRoot,
          path.join(args.resolveDir, args.path)
        )}#css-module-data`,
        namespace: "css-module",
        pluginData: args.pluginData as { css: string },
      })
    );
    build.onLoad(
      { filter: /#css-module-data$/, namespace: "css-module" },
      (args) => ({
        contents: (args.pluginData as { css: string }).css,
        loader: "css" as const,
      })
    );
  },
};
