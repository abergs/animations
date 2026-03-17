import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";

/**
 * Vite plugin that captures compiled CSS and injects it inline into the JS bundle.
 * The CSS is replaced into __EMBEDDED_CSS__ placeholder after both JS and CSS are generated.
 */
function embedCssPlugin(): Plugin {
  let outDir = "";

  return {
    name: "embed-css",
    enforce: "post",

    configResolved(config) {
      outDir = config.build.outDir;
    },

    writeBundle(_, bundle) {
      // Find the emitted CSS content
      let cssContent = "";
      let cssFileName = "";
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith(".css") && chunk.type === "asset" && typeof chunk.source === "string") {
          cssContent = chunk.source;
          cssFileName = fileName;
        }
      }

      if (!cssContent) return;

      // Find and patch JS files that reference __EMBEDDED_CSS__
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (!fileName.endsWith(".js") || chunk.type !== "chunk") continue;

        const filePath = resolve(outDir, fileName);
        let code = readFileSync(filePath, "utf-8");

        if (!code.includes("__EMBEDDED_CSS__")) continue;

        // Escape for embedding in a template literal
        const escaped = cssContent
          .replace(/\\/g, "\\\\")
          .replace(/`/g, "\\`")
          .replace(/\$/g, "\\$");

        // Replace all minified/unminified variants of the typeof check
        code = code.replace(
          /typeof\s+__EMBEDDED_CSS__\s*(?:<\s*[`"]u[`"]|!==\s*"undefined")\s*\?\s*__EMBEDDED_CSS__\s*:\s*(?:``|"")/g,
          "`" + escaped + "`",
        );

        writeFileSync(filePath, code);
      }

      // Delete the standalone CSS file
      if (cssFileName) {
        const cssPath = resolve(outDir, cssFileName);
        if (existsSync(cssPath)) {
          unlinkSync(cssPath);
        }
      }
    },
  };
}

// Build target is selected via EMBED_ENTRY env var
const entry = process.env.EMBED_ENTRY || "handshake";
const embedDir = resolve(__dirname, "src/embed");

export default defineConfig({
  plugins: [tailwindcss(), embedCssPlugin()],
  build: {
    outDir: "dist/embed",
    emptyOutDir: false,
    lib: {
      entry: resolve(embedDir, `${entry}.ts`),
      formats: ["iife"],
      name: "BwDiagram",
      fileName: () => `${entry}.js`,
    },
    cssCodeSplit: false,
    minify: true,
  },
});
