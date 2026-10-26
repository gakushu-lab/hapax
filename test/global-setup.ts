import { ensureTable } from "../api/local/setup";

export default async function () {
	await ensureTable();
}
