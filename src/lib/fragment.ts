import { decode, encode } from "./base64url";

// URL の # 以降。サーバーには送られない
export function buildFragment(secret: Uint8Array): string {
	return encode(secret);
}

export function parseFragment(hash: string): Uint8Array<ArrayBuffer> | null {
	try {
		const secret = decode(hash.replace(/^#/, ""));
		return secret.length === 32 ? secret : null;
	} catch {
		return null;
	}
}
