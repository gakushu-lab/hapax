import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { config } from "./config";

// Lambda の実行環境は再利用されるので、クライアントは1回だけ作る
let dynamo: DynamoDBDocumentClient | undefined;
let s3: S3Client | undefined;
let sqs: SQSClient | undefined;

export function dynamoClient(): DynamoDBDocumentClient {
	dynamo ??= DynamoDBDocumentClient.from(new DynamoDBClient({}));
	return dynamo;
}

export function s3Client(): S3Client {
	s3 ??= new S3Client({
		forcePathStyle: config().s3ForcePathStyle,
		// 既定ではチェックサムが署名付き URL に入り、ブラウザからの PUT が拒否される
		requestChecksumCalculation: "WHEN_REQUIRED",
	});
	return s3;
}

export function sqsClient(): SQSClient {
	sqs ??= new SQSClient({});
	return sqs;
}
