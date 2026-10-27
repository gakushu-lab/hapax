import { defineConfig } from "vitest/config";

// テストは docker compose の DynamoDB Local と S3Mock に対して動く
process.loadEnvFile("local.env");

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		globalSetup: ["src/testing/global-setup.ts"],
	},
});
