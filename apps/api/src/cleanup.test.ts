import { describe, expect, it } from "vitest";
import { cleanup, handler } from "./cleanup";
import { getItem } from "./db";
import { atExpression } from "./schedule";
import { objectSize } from "./storage";
import { api, createUpload, putObject, uploadReady } from "./testing/helpers";

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

describe("予約", () => {
	it("時刻を分単位に切り上げた UTC の at 式にする", () => {
		expect(atExpression(Date.UTC(2026, 9, 28, 1, 2, 0, 0))).toBe("at(2026-10-28T01:02:00)");
		expect(atExpression(Date.UTC(2026, 9, 28, 1, 2, 0, 1))).toBe("at(2026-10-28T01:03:00)");
		expect(atExpression(Date.UTC(2026, 9, 28, 23, 59, 30))).toBe("at(2026-10-29T00:00:00)");
	});

	it("EventBridge Scheduler から ID を受け取って消す", async () => {
		const id = await uploadReady(1);
		await api(`/api/downloads/${id}/consume`, { method: "POST" });
		expect(await handler({ id })).toBe("deleted");
		await expectDeleted(id);
	});
});
