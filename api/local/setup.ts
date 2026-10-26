import {
	CreateTableCommand,
	DescribeTableCommand,
	DynamoDBClient,
	ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";

// DynamoDB Local にテーブルを作る。本番のテーブルは Terraform が作る
export async function ensureTable(): Promise<void> {
	const client = new DynamoDBClient({});
	const TableName = process.env.TABLE_NAME!;
	try {
		await client.send(new DescribeTableCommand({ TableName }));
	} catch (e) {
		if (!(e instanceof ResourceNotFoundException)) throw e;
		await client.send(
			new CreateTableCommand({
				TableName,
				AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
				KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
				BillingMode: "PAY_PER_REQUEST",
			}),
		);
	}
}
