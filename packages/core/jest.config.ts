import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/js-with-ts-esm", // TS + ESM
  testEnvironment: "jsdom",

  // The lcov report the SonarCloud CI analysis reads (ci.yml sonar-coverage-paths).
  collectCoverage: true,
  // The lcov paths stay relative to this package (SF:src/…): the shared CI rebases them to the repository root
  // for SonarCloud; a root-relative report would be prefixed twice (krizaka-internal#3553).
  coverageReporters: ["lcov", "text-summary"],
  coverageDirectory: "coverage",

  // Treat these files as ESM so `import`/`export` keep working
  extensionsToTreatAsEsm: [".ts", ".tsx"],

  transform: {
    // Let ts-jest compile TS/JS for Jest
    "^.+\\.[tj]sx?$": ["ts-jest", { useESM: true }],
  },

  // Re-enable transform *inside* selected node_modules
  transformIgnorePatterns: [
    "/node_modules/(?!(?:\\.pnpm|@preact/signals-core|@preact/signals-react|@dnd-kit)/)",
  ],

  moduleNameMapper: {
    // stub out style & asset imports
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
  },
};

export default config;
