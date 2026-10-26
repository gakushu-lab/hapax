import { describe, expect, it } from "vitest";
import { api, createUpload, putObject } from "./helpers";

describe("アップロード", () => {
	it.each([
		{ meta: "", size: 10, expiresIn: 60, maxDownloads: 1 },
		{ meta: "m", size: 0, expiresIn: 60, maxDownloads: 1 },
		{ meta: "m", size: 10, expiresIn: 8 * 24 * 60 * 60, maxDownloads: 1 },
		{ meta: "m", size: 10, expiresIn: 60, maxDownloads: 11 },
	])("不正な入力は400 (%o)", async (body) => {
		const res = await api("/api/uploads", { method: "POST", body: JSON.stringify(body) });
		expect(res.status).toBe(400);
	});

	it("S3 に届いてサイズが一致すれば complete できる", async () => {
		const { id, uploadUrl } = await createUpload({ size: 5 });
		await putObject(uploadUrl, "hello");
		expect((await api(`/api/uploads/${id}/complete`, { method: "POST" })).status).toBe(204);
	});

	it("S3 に届いていなければ complete できない", async () => {
		const { id } = await createUpload();
		expect((await api(`/api/uploads/${id}/complete`, { method: "POST" })).status).toBe(409);
	});

	it("サイズが申告と違うと complete できない", async () => {
		const { id, uploadUrl } = await createUpload({ size: 999 });
		await putObject(uploadUrl, "short");
		expect((await api(`/api/uploads/${id}/complete`, { method: "POST" })).status).toBe(409);
	});
});
