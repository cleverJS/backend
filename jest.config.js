module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/*.spec.ts"],
  testPathIgnorePatterns: ["tmp", "node_modules", "core", "app"],
  setupFiles: ["dotenv/config"],
  moduleDirectories: [
    "node_modules",
    "src"
  ],
  moduleFileExtensions: [
    "js",
    "ts",
    "json"
  ],
  coverageDirectory: "./coverage"
}
