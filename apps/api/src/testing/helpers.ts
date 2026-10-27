import { expect } from "vitest";
import { app } from "../app";
import type { CreateUploadRequest, CreateUploadResponse } from "@hapax/shared/api";

export function api(path: string, init?: RequestInit) {
	return app.request(path, init);
}

export async function createUpload(overrides: Partial<CreateUploadRequest> = {}) {
	const res = await api("/api/uploads", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			meta: "encrypted-meta",
			size: 15,
			expiresIn: 3600,
			maxDownloads: 1,
			turnstileToken: "",
			...overrides,
		}),
	});
	expect(res.status).toBe(201);
	return res.json() as Promise<CreateUploadResponse>;
}

// 署名付き URL へ PUT する (ブラウザの代わり)
export async function putObject(uploadUrl: string, body: string) {
	const res = await fetch(uploadUrl, { method: "PUT", body });
	expect(res.status).toBe(200);
}

// アップロードして complete まで済ませる
export async function uploadReady(maxDownloads = 1, content = "encrypted-bytes") {
	const { id, uploadUrl } = await createUpload({ size: content.length, maxDownloads });
	await putObject(uploadUrl, content);
	expect((await api(`/api/uploads/${id}/complete`, { method: "POST" })).status).toBe(204);
	return id;
}
