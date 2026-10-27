import { expect, test } from "@playwright/test";

// OS の設定 (prefers-color-scheme) に合わせて配色が変わる
const schemes = [
	{ scheme: "light", background: "rgb(255, 255, 255)", text: "rgb(26, 26, 26)" },
	{ scheme: "dark", background: "rgb(26, 26, 26)", text: "rgb(242, 242, 242)" },
] as const;

for (const { scheme, background, text } of schemes) {
	test(`${scheme} の配色になる`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: scheme });
		await page.goto("/");
		const body = page.locator("body");
		await expect(body).toHaveCSS("background-color", background);
		await expect(body).toHaveCSS("color", text);
	});
}

test("ヘッダーのボタンで ライト → ダーク → OS に合わせる の順に切り替わり、再読み込みしても残る", async ({ page }) => {
	await page.emulateMedia({ colorScheme: "dark" });
	await page.goto("/");
	const body = page.locator("body");
	const toggle = page.getByRole("button", { name: /^表示モード/ });

	// 初めは OS の設定 (ダーク) に従う
	await expect(toggle).toHaveText("OS に合わせる");
	await expect(body).toHaveCSS("background-color", "rgb(26, 26, 26)");

	await toggle.click();
	await expect(toggle).toHaveText("ライト");
	await expect(body).toHaveCSS("background-color", "rgb(255, 255, 255)");

	await toggle.click();
	await expect(toggle).toHaveText("ダーク");
	await page.reload();
	await expect(toggle).toHaveText("ダーク");
	await expect(body).toHaveCSS("background-color", "rgb(26, 26, 26)");

	// OS に合わせるに戻すと、OS の設定の変更にも追従する
	await toggle.click();
	await expect(toggle).toHaveText("OS に合わせる");
	await page.emulateMedia({ colorScheme: "light" });
	await expect(body).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("スクロールしてもヘッダーが上に残る", async ({ page }) => {
	await page.setViewportSize({ width: 900, height: 400 });
	await page.goto("/");
	await page.mouse.wheel(0, 2000);
	// e2e の型設定には DOM が無いので、式を文字列で渡す
	await expect.poll(() => page.evaluate<number>("scrollY")).toBeGreaterThan(0);
	const box = await page.locator("header").boundingBox();
	expect(box?.y).toBe(0);
});
