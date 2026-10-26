import { describe, expect, it } from "vitest";
import type { DownloadInfo } from "../shared/api";
import { api, createUpload, putObject, uploadReady } from "./helpers";

const consume = (id: string) => api(`/api/downloads/${id}/consume`, { method: "POST" });

describe("ダウンロード", () => {
	it("complete するまでは受信側から見えない", async () => {
		const { id, uploadUrl } = await createUpload({ size: 5 });
		await putObject(uploadUrl, "hello");
		expect((await api(`/api/downloads/${id}`)).status).toBe(404);

		await api(`/api/uploads/${id}/complete`, { method: "POST" });
		expect((await api(`/api/downloads/${id}`)).status).toBe(200);
	});

	it("指定回数を超えると410", async () => {
		const id = await uploadReady(2);
		const info = (await (await api(`/api/downloads/${id}`)).json()) as DownloadInfo;
		expect(info.remaining).toBe(2);

		expect((await consume(id)).status).toBe(200);
		expect((await consume(id)).status).toBe(200);
		expect((await consume(id)).status).toBe(410);
		expect((await api(`/api/downloads/${id}`)).status).toBe(410);
	});

	it("署名付き GET URL で中身を取得できる", async () => {
		const id = await uploadReady(1, "cipher");
		const { downloadUrl } = (await (await consume(id)).json()) as { downloadUrl: string };
		expect(await (await fetch(downloadUrl)).text()).toBe("cipher");
	});

	it("同時に consume しても回数を超えない", async () => {
		const id = await uploadReady(1);
		const results = await Promise.all(Array.from({ length: 5 }, () => consume(id)));
		expect(results.map((r) => r.status).sort()).toEqual([200, 410, 410, 410, 410]);
	});

	it("存在しない ID は404", async () => {
		expect((await api("/api/downloads/AAAAAAAAAAAAAAAAAAAAAA")).status).toBe(404);
		expect((await consume("not-an-id")).status).toBe(404);
	});
});
