import { describe, expect, it } from "vitest";
import {
	CHUNK_SIZE,
	decryptMeta,
	decryptStream,
	deriveKeys,
	encryptFile,
	encryptMeta,
	encryptedSize,
	generateSecret,
} from "./crypto";

function randomBytes(size: number): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(size);
	// getRandomValues は1回 64KiB までなので分けて埋める
	for (let i = 0; i < size; i += 65536) {
		crypto.getRandomValues(out.subarray(i, Math.min(i + 65536, size)));
	}
	return out;
}

async function roundTrip(size: number) {
	const keys = await deriveKeys(generateSecret());
	const plain = randomBytes(size);
	const cipher = await encryptFile(keys.content, new Blob([plain]));
	expect(cipher.size).toBe(encryptedSize(size));

	const out = await decryptStream(keys.content, cipher.stream(), cipher.size);
	expect(new Uint8Array(await out.arrayBuffer())).toEqual(plain);
}

describe("本体の暗号化", () => {
	it.each([0, 1, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, CHUNK_SIZE * 3])(
		"%i バイトを往復できる",
		(size) => roundTrip(size),
	);

	it("チャンク境界で切り詰めると復号に失敗する", async () => {
		const keys = await deriveKeys(generateSecret());
		const cipher = await encryptFile(keys.content, new Blob([randomBytes(CHUNK_SIZE * 2)]));
		const truncated = cipher.slice(0, 1 + CHUNK_SIZE + 16);
		await expect(
			decryptStream(keys.content, truncated.stream(), truncated.size),
		).rejects.toThrow();
	});

	it("1バイト書き換えると復号に失敗する", async () => {
		const keys = await deriveKeys(generateSecret());
		const cipher = new Uint8Array(
			await (await encryptFile(keys.content, new Blob([randomBytes(100)]))).arrayBuffer(),
		);
		cipher[10] ^= 1;
		const blob = new Blob([cipher]);
		await expect(decryptStream(keys.content, blob.stream(), blob.size)).rejects.toThrow();
	});

	it("別の鍵では復号できない", async () => {
		const a = await deriveKeys(generateSecret());
		const b = await deriveKeys(generateSecret());
		const cipher = await encryptFile(a.content, new Blob([randomBytes(100)]));
		await expect(decryptStream(b.content, cipher.stream(), cipher.size)).rejects.toThrow();
	});
});

describe("ファイル情報の暗号化", () => {
	it("往復できる", async () => {
		const keys = await deriveKeys(generateSecret());
		const meta = { name: "見積書.pdf", type: "application/pdf", size: 1234 };
		expect(await decryptMeta(keys.meta, await encryptMeta(keys.meta, meta))).toEqual(meta);
	});
});
