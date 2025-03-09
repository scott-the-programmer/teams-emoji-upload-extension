module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types.ts",
    "!src/popup.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },
};
