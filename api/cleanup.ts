import type { SQSEvent } from "aws-lambda";
import { deleteItem, getItem } from "./db";
import type { EventName } from "./metrics";
import { scheduleCleanup, type CleanupMessage } from "./schedule";
import { deleteObject } from "./storage";

export type CleanupResult = "deleted" | "kept" | "missing";

// 予約が重なって2回呼ばれても問題ないように書く
export async function cleanup(id: string, now = Date.now()): Promise<CleanupResult> {
	const item = await getItem(id);
	if (!item) {
		await deleteObject(id);
		return "missing";
	}

	let event: EventName | undefined;
	if (item.status === "pending") event = "deleted_abandoned";
	else if (item.remaining <= 0) event = "deleted_consumed";
	else if (item.expiresAt <= now) {
		event = item.remaining === item.maxDownloads ? "deleted_unused" : "deleted_expired";
	}
	// 予約の時刻より前に呼ばれた場合などは消さない
	if (!event) return "kept";

	await deleteObject(id);
	await deleteItem(id);
	return "deleted";
}

// 予約の時刻がまだ先なら送り直し、過ぎていれば削除する
export async function processMessages(event: SQSEvent, now = Date.now()): Promise<void> {
	for (const record of event.Records) {
		const message = JSON.parse(record.body) as CleanupMessage;
		if (message.at > now) {
			await scheduleCleanup(message.id, message.at);
		} else {
			await cleanup(message.id, now);
		}
	}
}

// SQS から呼ばれる入口
export const handler = async (event: SQSEvent): Promise<void> => processMessages(event);
