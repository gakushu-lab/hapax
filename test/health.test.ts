import { expect, it } from "vitest";
import { app } from "../api/app";

it("health は200を返す", async () => {
	const res = await app.request("/api/health");
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({ ok: true });
});
