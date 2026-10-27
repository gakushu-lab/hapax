import { expect, test } from "@playwright/test";

test("パスワード付きのファイルは正しいパスワードでだけ開ける", async ({ page, browser }) => {
	await page.goto("/");
	await page.getByLabel("ファイル").setInputFiles({
		name: "secret.txt",
		mimeType: "text/plain",
		buffer: Buffer.from("password protected"),
	});
	await page.getByLabel("パスワード").fill("correct horse");
	await page.getByRole("button", { name: "暗号化して URL を発行" }).click();
	const url = await page.getByLabel("受け取る人に送る URL").inputValue();
	expect(url).toContain("#p.");

	const receiver = await (await browser.newContext()).newPage();
	await receiver.goto(url);

	await receiver.getByLabel("パスワード").fill("wrong");
	await receiver.getByRole("button", { name: "開く" }).click();
	await expect(receiver.getByText("パスワードが違います。")).toBeVisible();

	await receiver.getByLabel("パスワード").fill("correct horse");
	await receiver.getByRole("button", { name: "開く" }).click();
	await expect(receiver.getByText("secret.txt")).toBeVisible();

	const downloadPromise = receiver.waitForEvent("download");
	await receiver.getByRole("button", { name: "ダウンロード" }).click();
	expect((await downloadPromise).suggestedFilename()).toBe("secret.txt");
});
