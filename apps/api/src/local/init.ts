import { ensureTable } from "./setup";

await ensureTable();
console.log(`テーブル ${process.env.TABLE_NAME} を用意しました`);
