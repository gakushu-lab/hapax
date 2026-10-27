import { afterEach, beforeEach, expect, it } from "vitest";
import { app } from "../api/app";

// 本番と同じく DEV_MODE を外して、CloudFront が付ける値を確かめさせる
beforeEach(() => {
	process.env.DEV_MODE = "false";
	process.env.ORIGIN_SECRET = "origin-secret";
});

afterEach(() => {
	process.env.DEV_MODE = "true";
	delete process.env.ORIGIN_SECRET;
});

it("CloudFront の値が無い要求は 403", async () => {
	const res = await app.request("/api/health");
	expect(res.status).toBe(403);
});

it("値が違う要求は 403", async () => {
	const res = await app.request("/api/health", { headers: { "x-origin-verify": "wrong" } });
	expect(res.status).toBe(403);
});

it("値が一致すれば通る", async () => {
	const res = await app.request("/api/health", { headers: { "x-origin-verify": "origin-secret" } });
	expect(res.status).toBe(200);
});
