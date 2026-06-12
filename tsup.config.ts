import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/glint-canvas.ts"],
    format: ["esm", "cjs", "iife"],
    dts: true,
    clean: true,
    globalName: "GlintCanvas",
    sourcemap: true,
    minify: true,
    loader: {
        ".glsl": "text",
    },
});