import { defineConfig, devices } from "@playwright/test";

// 先に docker compose up -d で DynamoDB Local と S3Mock を起動しておく
export default defineConfig({
	testDir: "./e2e",
	use: {
		baseURL: "http://127.0.0.1:5173",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	// pnpm 経由で起動すると、テスト終了時にサーバーが止まらないので直接起動する
	webServer: [
		{
			command:
				"./node_modules/.bin/tsx --env-file=api/local.env api/local/init.ts && ./node_modules/.bin/tsx --env-file=api/local.env api/dev.ts",
			url: "http://127.0.0.1:8787/api/health",
			reuseExistingServer: !process.env.CI,
		},
		{
			command: "./node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort",
			url: "http://127.0.0.1:5173",
			reuseExistingServer: !process.env.CI,
		},
	],
});
