import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // src/test/ es scaffolding LOCAL (no versionado): tests de integración que
    // tocan la base de datos. No corren en la suite versionada ni en CI.
    exclude: [...configDefaults.exclude, "src/test/**"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test-utils/server-only-stub.ts"),
    },
  },
});
