import { build } from "esbuild";

// API (Lambda Web Function) と削除処理 (Lambda) を1ファイルずつに束ねる。Lambda が推奨する ES モジュール形式で出す
await build({
	entryPoints: ["api/lambda.ts", "api/cleanup.ts"],
	outdir: "dist-api",
	outExtension: { ".js": ".mjs" },
	bundle: true,
	platform: "node",
	target: "node24",
	format: "esm",
	minify: true,
	sourcemap: true,
	// AWS SDK の中の require を ES モジュールでも動かすため
	banner: {
		js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
	},
});
