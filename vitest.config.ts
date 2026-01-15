import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@lucidwallet/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@lucidwallet/tools": path.resolve(__dirname, "packages/tools/src/index.ts"),
      "@lucidwallet/wallet-core": path.resolve(__dirname, "packages/wallet-core/src/index.ts"),
      "@lucidwallet/shared": path.resolve(__dirname, "packages/shared/src/index.ts")
    }
  },
  test: {
    include: ["**/src/__tests__/**/*.test.ts"],
    environment: "node"
  }
});
