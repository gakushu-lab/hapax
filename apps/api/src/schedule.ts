import { ConflictException, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
import { schedulerClient } from "./clients";
import { config, required } from "./config";

const MINUTE = 60 * 1000;

// 予約の用途。同じ ID に用途ごとに1つずつ予約を作る
export type CleanupPurpose = "pending" | "expire" | "consumed";

// 削除用 Lambda に渡す入力
export type CleanupInput = { id: string };

// EventBridge Scheduler は指定した分の0秒から59秒の間に起動する。
// 時刻より前に起動しないよう、分単位に切り上げて UTC の at 式にする
export function atExpression(at: number): string {
	const minute = new Date(Math.ceil(at / MINUTE) * MINUTE);
	return `at(${minute.toISOString().slice(0, 19)})`;
}

// 削除用 Lambda を指定の時刻に1回だけ呼ぶ予約を作る
export async function scheduleCleanup(id: string, at: number, purpose: CleanupPurpose): Promise<void> {
	// 開発時は EventBridge Scheduler が無いので予約しない
	if (config().devMode) return;

	const input: CleanupInput = { id };
	try {
		await schedulerClient().send(
			new CreateScheduleCommand({
				Name: `${id}-${purpose}`,
				GroupName: required("CLEANUP_SCHEDULE_GROUP"),
				ScheduleExpression: atExpression(at),
				ScheduleExpressionTimezone: "UTC",
				FlexibleTimeWindow: { Mode: "OFF" },
				// 実行し終えた予約もクォータに数えられるので消す
				ActionAfterCompletion: "DELETE",
				Target: {
					Arn: required("CLEANUP_FUNCTION_ARN"),
					RoleArn: required("CLEANUP_SCHEDULER_ROLE_ARN"),
					Input: JSON.stringify(input),
					// 呼び出しに失敗し続けたときの送り先
					DeadLetterConfig: { Arn: required("CLEANUP_FAILED_QUEUE_ARN") },
				},
			}),
		);
	} catch (e) {
		// 同じ予約がすでにあるなら作り直さない
		if (e instanceof ConflictException) return;
		throw e;
	}
}
