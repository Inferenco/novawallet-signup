import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [react()],
    server: {
      allowedHosts: true
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@cedra-labs/wallet-adapter-plugin": resolve(
          __dirname,
          "node_modules/@cedra-labs/wallet-adapter-plugin/src/index.ts"
        )
      }
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      globals: true,
      css: true,
      exclude: ["tests/e2e/**", "node_modules/**", "dist/**"]
    },
    optimizeDeps: {
      include: [
        "@cedra-labs/wallet-adapter-core",
        "@cedra-labs/ts-sdk",
        "@cedra-labs/wallet-standard"
      ]
    }
  };
});
