import { Hono } from "hono";
import {
	MAX_DOWNLOADS,
	MAX_EXPIRES_IN,
	MAX_SIZE,
	type ApiError,
	type ConsumeResponse,
	type CreateUploadRequest,
	type CreateUploadResponse,
	type DownloadInfo,
} from "../shared/api";
import { config, required } from "./config";
import { consume, getItem, markReady, putPending } from "./db";
import { scheduleCleanup } from "./schedule";
import { DOWNLOAD_URL_TTL, objectSize, presignGet, presignPut } from "./storage";
import { verifyTurnstile } from "./turnstile";

// アップロードが終わらないまま放置されたものを消すまでの時間
const PENDING_TTL_MS = 60 * 60 * 1000;
// 残り回数が0になってから消すまでの時間。署名付き GET URL の有効期限に余裕を足す
const DELETE_DELAY_MS = DOWNLOAD_URL_TTL * 1000 + 30_000;

export const app = new Hono();

const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

// 128bit の乱数を base64url にした ID (22文字)
function newId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Buffer.from(bytes).toString("base64url");
}

function error(message: string): ApiError {
	return { error: message };
}

function isValidUpload(body: CreateUploadRequest): boolean {
	return (
		typeof body.meta === "string" &&
		body.meta.length > 0 &&
		body.meta.length <= 4096 &&
		Number.isInteger(body.size) &&
		body.size > 0 &&
		body.size <= MAX_SIZE &&
		Number.isInteger(body.expiresIn) &&
		body.expiresIn > 0 &&
		body.expiresIn <= MAX_EXPIRES_IN &&
		Number.isInteger(body.maxDownloads) &&
		body.maxDownloads >= 1 &&
		body.maxDownloads <= MAX_DOWNLOADS
	);
}

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/uploads", async (c) => {
	const body = await c.req.json<CreateUploadRequest>().catch(() => null);
	if (!body || !isValidUpload(body)) return c.json(error("invalid_request"), 400);

	// 開発時は Turnstile を使わない
	if (!config().devMode) {
		const ok = await verifyTurnstile(required("TURNSTILE_SECRET"), body.turnstileToken);
		if (!ok) return c.json(error("turnstile_failed"), 403);
	}

	const id = newId();
	await putPending({
		id,
		meta: body.meta,
		size: body.size,
		maxDownloads: body.maxDownloads,
		expiresAt: Date.now() + body.expiresIn * 1000,
	});
	await scheduleCleanup(id, Date.now() + PENDING_TTL_MS);

	const uploadUrl = await presignPut(id);
	return c.json<CreateUploadResponse>({ id, uploadUrl }, 201);
});

app.post("/api/uploads/:id/complete", async (c) => {
	const id = c.req.param("id");
	if (!ID_PATTERN.test(id)) return c.json(error("not_found"), 404);

	const size = await objectSize(id);
	if (size === null) return c.json(error("not_uploaded"), 409);

	const item = await markReady(id, size);
	if (!item) return c.json(error("size_mismatch"), 409);
	await scheduleCleanup(id, item.expiresAt);
	return c.body(null, 204);
});

app.get("/api/downloads/:id", async (c) => {
	const id = c.req.param("id");
	if (!ID_PATTERN.test(id)) return c.json(error("not_found"), 404);

	const item = await getItem(id);
	if (!item || item.status !== "ready") return c.json(error("not_found"), 404);
	if (item.remaining <= 0 || item.expiresAt <= Date.now()) return c.json(error("gone"), 410);
	return c.json<DownloadInfo>({
		meta: item.meta,
		size: item.size,
		remaining: item.remaining,
		expiresAt: item.expiresAt,
	});
});

app.post("/api/downloads/:id/consume", async (c) => {
	const id = c.req.param("id");
	if (!ID_PATTERN.test(id)) return c.json(error("not_found"), 404);

	const result = await consume(id, Date.now());
	if (result.kind === "not_found") return c.json(error("not_found"), 404);
	if (result.kind === "gone") return c.json(error("gone"), 410);

	if (result.item.remaining === 0) {
		// 受信者が取得し終えるまで S3 のオブジェクトは残す
		await scheduleCleanup(id, Date.now() + DELETE_DELAY_MS);
	}
	const downloadUrl = await presignGet(id);
	return c.json<ConsumeResponse>({ downloadUrl });
});
