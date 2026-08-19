import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // single-threaded: tests use shared tmp fixtures; keep RAM low on small machines
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30_000,
  },
});
