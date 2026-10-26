import { describe, expect, it } from "vitest";
import { generateSecret, unwrapSecret, wrapSecret } from "../src/lib/crypto";
import { buildFragment, parseFragment } from "../src/lib/fragment";

describe("パスワード", () => {
	it("正しいパスワードで秘密鍵を取り出せる", async () => {
		const secret = generateSecret();
		const wrapped = await wrapSecret(secret, "correct horse");
		expect(await unwrapSecret(wrapped, "correct horse")).toEqual(secret);
	});

	it("違うパスワードでは失敗する", async () => {
		const wrapped = await wrapSecret(generateSecret(), "correct horse");
		await expect(unwrapSecret(wrapped, "wrong")).rejects.toThrow();
	});
});

describe("fragment", () => {
	it("パスワード無しを往復できる", () => {
		const secret = generateSecret();
		expect(parseFragment(`#${buildFragment({ kind: "plain", secret })}`)).toEqual({
			kind: "plain",
			secret,
		});
	});

	it("パスワード有りを往復できる", async () => {
		const wrapped = await wrapSecret(generateSecret(), "pw");
		const parsed = parseFragment(`#${buildFragment({ kind: "password", wrapped })}`);
		expect(parsed).toEqual({ kind: "password", wrapped });
	});

	it.each(["", "#", "#abc", "#p.abc", "#p.!!.??"])("%s は null", (hash) => {
		expect(parseFragment(hash)).toBeNull();
	});
});
