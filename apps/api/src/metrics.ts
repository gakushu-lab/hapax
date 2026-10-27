// CloudWatch の埋め込みメトリクス形式 (Embedded Metric Format, EMF) でログに書く。
// ログから自動でメトリクスが作られるので、SDK で PutMetricData を呼ばなくてよい
export type EventName =
	| "upload_created"
	| "upload_completed"
	| "consumed"
	| "deleted_consumed" // 回数に達して削除
	| "deleted_expired" // 期限切れで削除 (1回以上ダウンロードされた)
	| "deleted_unused" // 一度もダウンロードされずに期限切れで削除
	| "deleted_abandoned"; // アップロードが完了しないまま削除

export function emit(event: EventName, bytes: number): void {
	process.stdout.write(
		`${JSON.stringify({
			_aws: {
				Timestamp: Date.now(),
				CloudWatchMetrics: [
					{
						Namespace: "hapax",
						Dimensions: [["Event"]],
						Metrics: [
							{ Name: "Count", Unit: "Count" },
							{ Name: "Bytes", Unit: "Bytes" },
						],
					},
				],
			},
			Event: event,
			Count: 1,
			Bytes: bytes,
		})}\n`,
	);
}
