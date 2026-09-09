import { defineConfig } from "vitest/config";
import os from "os";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DUAER_SQLITE: path.join(os.tmpdir(), "duaer-vitest.sqlite"),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
