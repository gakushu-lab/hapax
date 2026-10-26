import { decode, encode } from "./base64url";
import type { WrappedSecret } from "./crypto";

// URL の # 以降。サーバーには送られない
// パスワード無し: {秘密鍵}
// パスワード有り: p.{salt}.{包んだ秘密鍵}
export type Fragment =
	| { kind: "plain"; secret: Uint8Array<ArrayBuffer> }
	| { kind: "password"; wrapped: WrappedSecret };

export function buildFragment(fragment: Fragment): string {
	if (fragment.kind === "plain") return encode(fragment.secret);
	return `p.${encode(fragment.wrapped.salt)}.${encode(fragment.wrapped.wrapped)}`;
}

export function parseFragment(hash: string): Fragment | null {
	const text = hash.replace(/^#/, "");
	try {
		if (text.startsWith("p.")) {
			const [, salt, wrapped] = text.split(".");
			const parsed = { salt: decode(salt), wrapped: decode(wrapped) };
			// salt 16バイト、IV 12バイト + 秘密鍵 32バイト + 認証タグ 16バイト
			if (parsed.salt.length !== 16 || parsed.wrapped.length !== 60) return null;
			return { kind: "password", wrapped: parsed };
		}
		const secret = decode(text);
		return secret.length === 32 ? { kind: "plain", secret } : null;
	} catch {
		return null;
	}
}
