import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "@convex": fileURLToPath(new URL("./convex", import.meta.url)) } },
  test: { environment: "edge-runtime", include: ["convex/**/*.test.ts", "src/lib/**/*.test.ts", "src/app/admin/analytics/**/*.test.tsx"] },
});
