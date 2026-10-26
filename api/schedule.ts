import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./clients";
import { config, required } from "./config";

// SQS の遅延配信で待てる上限 (15分)
const MAX_DELAY_SECONDS = 15 * 60;

// 予約の中身。at は削除してよくなる時刻 (UNIX 時刻、ミリ秒)
export type CleanupMessage = { id: string; at: number };

// 今から at までの待ち時間 (秒)。上限を超える分は、受け取った削除用 Lambda が送り直してつなぐ
export function delaySeconds(at: number, now = Date.now()): number {
	return Math.min(Math.max(Math.ceil((at - now) / 1000), 0), MAX_DELAY_SECONDS);
}

// 削除用 Lambda を指定の時刻に呼ぶ予約を、SQS の遅延配信で作る
export async function scheduleCleanup(id: string, at: number): Promise<void> {
	// 開発時は SQS が無いので予約しない
	if (config().devMode) return;

	const message: CleanupMessage = { id, at };
	await sqsClient().send(
		new SendMessageCommand({
			QueueUrl: required("CLEANUP_QUEUE_URL"),
			MessageBody: JSON.stringify(message),
			DelaySeconds: delaySeconds(at),
		}),
	);
}
