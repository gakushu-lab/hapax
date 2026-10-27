const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// 利用者の IP アドレス (remoteip) は任意項目なので送らない。
// X-Forwarded-For の先頭は利用者が偽装できるため
export async function verifyTurnstile(secret: string, token: string): Promise<boolean> {
	const body = new FormData();
	body.append("secret", secret);
	body.append("response", token);

	const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
	if (!res.ok) return false;
	const data = (await res.json()) as { success: boolean };
	return data.success;
}
