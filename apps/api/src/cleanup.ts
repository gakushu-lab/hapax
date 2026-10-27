import { deleteItem, getItem } from "./db";
import { emit, type EventName } from "./metrics";
import type { CleanupInput } from "./schedule";
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
	emit(event, item.size);
	return "deleted";
}

// EventBridge Scheduler から予約の時刻に呼ばれる入口
export const handler = async (input: CleanupInput): Promise<CleanupResult> => cleanup(input.id);
