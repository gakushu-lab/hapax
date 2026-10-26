import type { SQSEvent } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { cleanup, processMessages } from "../api/cleanup";
import { getItem } from "../api/db";
import { delaySeconds } from "../api/schedule";
import { objectSize } from "../api/storage";
import { api, createUpload, putObject, uploadReady } from "./helpers";

const DAY = 24 * 60 * 60 * 1000;

async function expectDeleted(id: string) {
	expect(await getItem(id)).toBeUndefined();
	expect(await objectSize(id)).toBeNull();
}

describe("削除", () => {
	it("回数に達したものは消える", async () => {
		const id = await uploadReady(1);
		await api(`/api/downloads/${id}/consume`, { method: "POST" });
		expect(await cleanup(id)).toBe("deleted");
		await expectDeleted(id);
	});

	it("期限前で回数が残っていれば消さない", async () => {
		const id = await uploadReady(2);
		expect(await cleanup(id)).toBe("kept");
		expect(await objectSize(id)).not.toBeNull();
	});

	it("期限を過ぎれば、一度もダウンロードされていなくても消える", async () => {
		const id = await uploadReady(3);
		expect(await cleanup(id, Date.now() + 2 * DAY)).toBe("deleted");
		await expectDeleted(id);
	});

	it("complete されないまま放置されたものも消える", async () => {
		const { id, uploadUrl } = await createUpload({ size: 5 });
		await putObject(uploadUrl, "hello");
		expect(await cleanup(id)).toBe("deleted");
		await expectDeleted(id);
	});

	it("2回呼ばれても失敗しない", async () => {
		const id = await uploadReady(1);
		await api(`/api/downloads/${id}/consume`, { method: "POST" });
		expect(await cleanup(id)).toBe("deleted");
		expect(await cleanup(id)).toBe("missing");
	});
});

// SQS から届くイベントのうち、削除用 Lambda が読む部分だけを作る
function sqsEvent(id: string, at: number): SQSEvent {
	return { Records: [{ body: JSON.stringify({ id, at }) }] } as SQSEvent;
}

describe("予約", () => {
	it("待ち時間は秒に切り上げ、SQS の上限の15分で頭打ちにする", () => {
		const now = 1_000_000;
		expect(delaySeconds(now - 5000, now)).toBe(0);
		expect(delaySeconds(now + 1500, now)).toBe(2);
		expect(delaySeconds(now + 10 * 60 * 1000, now)).toBe(600);
		expect(delaySeconds(now + 2 * 60 * 60 * 1000, now)).toBe(900);
	});

	it("時刻がまだ先の予約では消さない", async () => {
		const id = await uploadReady(1);
		await api(`/api/downloads/${id}/consume`, { method: "POST" });
		await processMessages(sqsEvent(id, Date.now() + 60_000));
		expect(await objectSize(id)).not.toBeNull();
	});

	it("時刻を過ぎた予約で消える", async () => {
		const id = await uploadReady(1);
		await api(`/api/downloads/${id}/consume`, { method: "POST" });
		await processMessages(sqsEvent(id, Date.now() - 1000));
		await expectDeleted(id);
	});
});
