import { describe, expect, it } from "vitest";
import { presignPut } from "../api/storage";

describe("署名付き URL", () => {
	it("PUT の URL にチェックサムの指定が入らない", async () => {
		const url = new URL(await presignPut("abc"));
		expect(url.pathname).toBe("/hapax-files/abc");
		expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
		expect([...url.searchParams.keys()].some((k) => k.toLowerCase().includes("checksum"))).toBe(false);
	});
});
