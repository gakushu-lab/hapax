import { defineConfig } from "vitest/config";

// テストは docker compose の DynamoDB Local と S3Mock に対して動く
process.loadEnvFile("api/local.env");

export default defineConfig({
	test: {
		include: ["test/**/*.test.ts"],
		globalSetup: ["test/global-setup.ts"],
	},
});
