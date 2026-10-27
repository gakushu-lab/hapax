import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { cleanup } from "../api/cleanup";
import { api, createUpload, uploadReady } from "./helpers";

type Emf = {
	_aws: { CloudWatchMetrics: { Namespace: string; Dimensions: string[][] }[] };
	Event: string;
	Count: number;
	Bytes: number;
};

let write: MockInstance<typeof process.stdout.write>;

beforeEach(() => {
	write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});

afterEach(() => {
	write.mockRestore();
});

// 標準出力に書かれた行のうち、EMF の行だけを取り出す
function emitted(): Emf[] {
	return write.mock.calls
		.map(([chunk]) => String(chunk))
		.filter((line) => line.startsWith('{"_aws"'))
		.map((line) => JSON.parse(line) as Emf);
}

describe("メトリクス", () => {
	it("作成から削除までの各イベントを、暗号文のバイト数と一緒に記録する", async () => {
		const content = "encrypted-bytes";
		const id = await uploadReady(1, content);
		await api(`/api/downloads/${id}/consume`, { method: "POST" });
		await cleanup(id);

		const lines = emitted();
		expect(lines.map((l) => l.Event)).toEqual([
			"upload_created",
			"upload_completed",
			"consumed",
			"deleted_consumed",
		]);
		for (const line of lines) {
			expect(line.Count).toBe(1);
			expect(line.Bytes).toBe(content.length);
			expect(line._aws.CloudWatchMetrics[0].Namespace).toBe("hapax");
			expect(line._aws.CloudWatchMetrics[0].Dimensions).toEqual([["Event"]]);
		}
	});

	it("完了しなかったアップロードは deleted_abandoned として記録する", async () => {
		const { id } = await createUpload();
		await cleanup(id, Date.now() + 2 * 60 * 60 * 1000);
		expect(emitted().map((l) => l.Event)).toEqual(["upload_created", "deleted_abandoned"]);
	});

	it("失敗した要求は記録しない", async () => {
		const res = await api("/api/uploads/AAAAAAAAAAAAAAAAAAAAAA/complete", { method: "POST" });
		expect(res.status).toBe(409);
		expect(emitted()).toEqual([]);
	});
});
