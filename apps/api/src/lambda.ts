import { serve } from "@hono/node-server";
import { required } from "./config";
import { app } from "./app";

// Lambda Web Function の入口。待ち受ける先は環境変数 AWS_LAMBDA_HTTP_ENDPOINT (host:port) で渡される
const endpoint = required("AWS_LAMBDA_HTTP_ENDPOINT");
const colon = endpoint.lastIndexOf(":");
serve({
	fetch: app.fetch,
	hostname: endpoint.slice(0, colon),
	port: Number(endpoint.slice(colon + 1)),
});
