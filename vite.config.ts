import type { UserConfig } from "vite";
import { Features } from "lightningcss";
import browserslistToEsbuild from "browserslist-to-esbuild";


const viteConfig: UserConfig = {
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
    cssCodeSplit: true,
    minify: true,

    lib: {
      entry: ["gl-simple-builder.ts", "gl-simple-runtime.ts"],
      formats: ["es"],
    },

    rollupOptions: {
      input: {
        "gl-simple": "gl-simple.css",
        "gl-simple-builder": "gl-simple-builder.ts",
        "gl-simple-runtime": "gl-simple-runtime.ts",
      },
      output: {
        entryFileNames: "[name].min.js",
        assetFileNames: "[name].min.[ext]",
      },
    },
  }
};
export default viteConfig;