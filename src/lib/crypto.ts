import { decode, encode } from "./base64url";

// 暗号文の形式
// [版番号 1バイト][チャンク0][チャンク1]...[最終チャンク]
// 各チャンクは平文 64KiB を AES-256-GCM で暗号化したもの (末尾に16バイトの認証タグ)
export const CHUNK_SIZE = 64 * 1024;
const TAG_SIZE = 16;
const RECORD_SIZE = CHUNK_SIZE + TAG_SIZE;
const VERSION = 1;

export type FileMeta = {
	name: string;
	type: string;
	size: number;
};

export type Keys = {
	content: CryptoKey;
	meta: CryptoKey;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// URL の fragment に入れる 256bit の秘密鍵
export function generateSecret(): Uint8Array<ArrayBuffer> {
	return crypto.getRandomValues(new Uint8Array(32));
}

// 秘密鍵から本体用と情報用の鍵を、HMAC ベースの鍵導出関数 (HMAC-based Key Derivation Function, HKDF) で導出する
export async function deriveKeys(secret: Uint8Array<ArrayBuffer>): Promise<Keys> {
	const base = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveKey"]);
	const derive = (info: string) =>
		crypto.subtle.deriveKey(
			{ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: encoder.encode(info) },
			base,
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt", "decrypt"],
		);
	return {
		content: await derive("hapax content v1"),
		meta: await derive("hapax meta v1"),
	};
}

export async function encryptMeta(key: CryptoKey, meta: FileMeta): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const plain = encoder.encode(JSON.stringify(meta));
	const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
	const out = new Uint8Array(iv.length + cipher.length);
	out.set(iv);
	out.set(cipher, iv.length);
	return encode(out);
}

export async function decryptMeta(key: CryptoKey, text: string): Promise<FileMeta> {
	const bytes = decode(text);
	const plain = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: bytes.slice(0, 12) },
		key,
		bytes.slice(12),
	);
	return JSON.parse(decoder.decode(plain)) as FileMeta;
}

// ノンス: 11バイトのチャンク番号 + 最終チャンクの印 1バイト (age の STREAM 形式と同じ構成)
function nonce(index: number, last: boolean): Uint8Array<ArrayBuffer> {
	const n = new Uint8Array(12);
	new DataView(n.buffer).setUint32(7, index);
	n[11] = last ? 1 : 0;
	return n;
}

function chunkCount(plainSize: number): number {
	return Math.max(1, Math.ceil(plainSize / CHUNK_SIZE));
}

export function encryptedSize(plainSize: number): number {
	return 1 + plainSize + chunkCount(plainSize) * TAG_SIZE;
}

export async function encryptFile(
	key: CryptoKey,
	file: Blob,
	onProgress?: (ratio: number) => void,
): Promise<Blob> {
	const count = chunkCount(file.size);
	const parts: (ArrayBuffer | Uint8Array<ArrayBuffer>)[] = [new Uint8Array([VERSION])];
	for (let i = 0; i < count; i++) {
		const plain = await file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).arrayBuffer();
		const iv = nonce(i, i === count - 1);
		parts.push(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
		onProgress?.((i + 1) / count);
	}
	return new Blob(parts);
}

function concat(a: Uint8Array<ArrayBuffer>, b: Uint8Array): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(a.length + b.length);
	out.set(a);
	out.set(b, a.length);
	return out;
}

export async function decryptStream(
	key: CryptoKey,
	stream: ReadableStream<Uint8Array>,
	totalSize: number,
	onProgress?: (ratio: number) => void,
): Promise<Blob> {
	const reader = stream.getReader();
	const parts: ArrayBuffer[] = [];
	let buffer = new Uint8Array(0);
	let received = 0;
	let index = 0;
	let versionChecked = false;

	const decryptRecord = async (record: Uint8Array<ArrayBuffer>, last: boolean) => {
		const iv = nonce(index, last);
		parts.push(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, record));
		index++;
	};

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		received += value.length;
		buffer = concat(buffer, value);
		onProgress?.(received / totalSize);

		if (!versionChecked && buffer.length > 0) {
			if (buffer[0] !== VERSION) throw new Error("unsupported_version");
			buffer = buffer.slice(1);
			versionChecked = true;
		}
		// 後ろにまだデータがあるなら、最終チャンクではない
		while (buffer.length > RECORD_SIZE) {
			await decryptRecord(buffer.slice(0, RECORD_SIZE), false);
			buffer = buffer.slice(RECORD_SIZE);
		}
	}

	if (!versionChecked || buffer.length < TAG_SIZE) throw new Error("truncated");
	// 切り詰められていれば、最終チャンクの印が合わず復号に失敗する
	await decryptRecord(buffer, true);
	return new Blob(parts);
}
