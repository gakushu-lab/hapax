import { defineConfig, devices } from "@playwright/test";

// 先に docker compose up -d で DynamoDB Local と S3Mock を起動しておく
export default defineConfig({
	testDir: "./tests",
	use: {
		baseURL: "http://127.0.0.1:5173",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	// pnpm 経由で起動すると、テスト終了時にサーバーが止まらないので直接起動する
	webServer: [
		{
			command:
				"./node_modules/.bin/tsx --env-file=local.env src/local/init.ts && ./node_modules/.bin/tsx --env-file=local.env src/dev.ts",
			cwd: "../api",
			url: "http://127.0.0.1:8787/api/health",
			reuseExistingServer: !process.env.CI,
		},
		{
			command: "./node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort",
			cwd: "../web",
			url: "http://127.0.0.1:5173",
			reuseExistingServer: !process.env.CI,
		},
	],
});
