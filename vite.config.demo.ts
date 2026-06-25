import { resolve } from "path";
import type { UserConfig } from "vite";
import { Features } from "lightningcss";
import browserslistToEsbuild from "browserslist-to-esbuild";

const viteConfig: UserConfig = {
  root: resolve(__dirname, "demo"),

  css: {
    lightningcss: {
      // Disable light-dark() polyfill. It doesn't really work right, and this feature
      // will hit baseline-widely-available pretty soon (Nov 2026).
      exclude: Features.LightDark,
    },
  },

  build: {
    /*
     * Obey the browserslist options set in package.json, instead of Vite's default
     * (baseline-widely-available, as seen in Jan of the current year). 
     *
     * We generally want baseline-widely-available, but we should use the current one,
     * not one that might be almost a year out of date, that's too conservative.
     */
    target: browserslistToEsbuild(),

    outDir: resolve(__dirname, "demo/dist"),
  },
};

export default viteConfig;