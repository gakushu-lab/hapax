import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "./clients";
import { config } from "./config";

// DynamoDB の有効期限 (Time To Live, TTL) による削除は期限から数日遅れることがあるので、保険にだけ使う。期限の判定は expiresAt で行う
const TTL_MARGIN_SECONDS = 24 * 60 * 60;

export type Item = {
	id: string;
	status: "pending" | "ready";
	meta: string;
	size: number;
	maxDownloads: number;
	remaining: number;
	expiresAt: number; // UNIX 時刻 (ミリ秒)
	ttl: number; // UNIX 時刻 (秒)。DynamoDB の TTL 属性
};

export type NewItem = Pick<Item, "id" | "meta" | "size" | "maxDownloads" | "expiresAt">;

export type ConsumeResult =
	| { kind: "ok"; item: Item }
	| { kind: "not_found" }
	| { kind: "gone" };

export async function putPending(input: NewItem): Promise<Item> {
	const item: Item = {
		...input,
		status: "pending",
		remaining: input.maxDownloads,
		ttl: Math.floor(input.expiresAt / 1000) + TTL_MARGIN_SECONDS,
	};
	await dynamoClient().send(
		new PutCommand({
			TableName: config().tableName,
			Item: item,
			ConditionExpression: "attribute_not_exists(id)",
		}),
	);
	return item;
}

export async function getItem(id: string): Promise<Item | undefined> {
	const res = await dynamoClient().send(new GetCommand({ TableName: config().tableName, Key: { id } }));
	return res.Item as Item | undefined;
}

// アップロード中で、サイズが申告と一致するときだけ公開する
export async function markReady(id: string, actualSize: number): Promise<Item | null> {
	try {
		const res = await dynamoClient().send(
			new UpdateCommand({
				TableName: config().tableName,
				Key: { id },
				UpdateExpression: "SET #status = :ready",
				ConditionExpression: "#status = :pending AND #size = :size",
				ExpressionAttributeNames: { "#status": "status", "#size": "size" },
				ExpressionAttributeValues: { ":ready": "ready", ":pending": "pending", ":size": actualSize },
				ReturnValues: "ALL_NEW",
			}),
		);
		return res.Attributes as Item;
	} catch (e) {
		if (e instanceof ConditionalCheckFailedException) return null;
		throw e;
	}
}

// 残り回数を1減らす。条件付き更新なので、同時に呼ばれても回数を超えない
export async function consume(id: string, now: number): Promise<ConsumeResult> {
	try {
		const res = await dynamoClient().send(
			new UpdateCommand({
				TableName: config().tableName,
				Key: { id },
				UpdateExpression: "SET remaining = remaining - :one",
				ConditionExpression: "#status = :ready AND remaining > :zero AND expiresAt > :now",
				ExpressionAttributeNames: { "#status": "status" },
				ExpressionAttributeValues: { ":one": 1, ":zero": 0, ":ready": "ready", ":now": now },
				ReturnValues: "ALL_NEW",
			}),
		);
		return { kind: "ok", item: res.Attributes as Item };
	} catch (e) {
		if (!(e instanceof ConditionalCheckFailedException)) throw e;
		const item = await getItem(id);
		if (!item || item.status !== "ready") return { kind: "not_found" };
		return { kind: "gone" };
	}
}

export async function deleteItem(id: string): Promise<void> {
	await dynamoClient().send(new DeleteCommand({ TableName: config().tableName, Key: { id } }));
}
