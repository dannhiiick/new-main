import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Resolve .js extensions to .ts files (NodeNext compat)
    alias: {
      // vitest handles .js -> .ts resolution automatically for ts files
    },
  },
  resolve: {
    // Allow importing .js extensions that map to .ts source files
    extensions: [".ts", ".js"],
  },
});
