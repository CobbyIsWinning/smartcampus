import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // Ignore agent git worktrees nested under the repo so their duplicate
    // test files are not discovered during normal runs.
    exclude: ["**/node_modules/**", "**/.claude/**", "**/dist/**"],
  },
});
