import { expect, test, type Page } from "@playwright/test";

async function send(page: Page, content: string, downloads = "1回") {
	await page.goto("/");
	await page.getByLabel("ファイル").setInputFiles({
		name: "memo.txt",
		mimeType: "text/plain",
		buffer: Buffer.from(content),
	});
	await page.getByLabel("ダウンロードできる回数").selectOption(downloads);
	await page.getByRole("button", { name: "暗号化して URL を発行" }).click();
	await expect(page.getByRole("heading", { name: "URL を発行しました" })).toBeVisible();
	return page.getByLabel("受け取る人に送る URL").inputValue();
}

test("送ったファイルを別のブラウザで受け取れる", async ({ page, browser }) => {
	const url = await send(page, "秘密のメモ");

	const receiver = await (await browser.newContext()).newPage();
	await receiver.goto(url);
	await expect(receiver.getByText("memo.txt")).toBeVisible();

	const downloadPromise = receiver.waitForEvent("download");
	await receiver.getByRole("button", { name: "ダウンロード" }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toBe("memo.txt");
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk as Buffer);
	expect(Buffer.concat(chunks).toString()).toBe("秘密のメモ");

	await receiver.reload();
	await expect(receiver.getByText("ファイルは削除されました")).toBeVisible();
});

test("fragment が欠けた URL はエラーになる", async ({ page }) => {
	const url = await send(page, "abc");
	await page.goto(url.split("#")[0]);
	await expect(page.getByText("URL が正しくありません")).toBeVisible();
});

test("ファイル未選択では送信できない", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("button", { name: "暗号化して URL を発行" }).click();
	await expect(page.getByText("ファイルを選択してください。")).toBeVisible();
});
