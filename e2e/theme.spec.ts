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
