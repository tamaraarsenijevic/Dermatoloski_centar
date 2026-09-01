import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      all: true,
      include: [
        "src/components/**/*.{ts,tsx}",
        "src/context/**/*.{ts,tsx}",
        "src/pages/Login/**/*.{ts,tsx}",
        "src/pages/Pocetna.tsx",
        "src/router/PublicRoute/**/*.{ts,tsx}",
        "src/utils/formatters.ts",
      ],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.css",
        "src/**/*.d.ts",
        "src/test/**",
        "src/assets/**",
        "src/main.tsx",
        "src/App.tsx",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
