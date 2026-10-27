import { serve } from "@hono/node-server";
import { app } from "./app";

// ローカル開発用。Vite の開発サーバーが /api をここへ中継する
serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 8787 }, (info) => {
	console.log(`API: http://127.0.0.1:${info.port}`);
});
