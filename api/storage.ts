import {
	GetObjectCommand,
	HeadObjectCommand,
	NotFound,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./clients";
import { config } from "./config";

export const UPLOAD_URL_TTL = 15 * 60; // 15分
export const DOWNLOAD_URL_TTL = 60; // 60秒

export function presignPut(key: string): Promise<string> {
	return getSignedUrl(s3Client(), new PutObjectCommand({ Bucket: config().bucketName, Key: key }), {
		expiresIn: UPLOAD_URL_TTL,
	});
}

export function presignGet(key: string): Promise<string> {
	return getSignedUrl(s3Client(), new GetObjectCommand({ Bucket: config().bucketName, Key: key }), {
		expiresIn: DOWNLOAD_URL_TTL,
	});
}

// オブジェクトが無ければ null
export async function objectSize(key: string): Promise<number | null> {
	try {
		const res = await s3Client().send(new HeadObjectCommand({ Bucket: config().bucketName, Key: key }));
		return res.ContentLength ?? null;
	} catch (e) {
		if (e instanceof NotFound) return null;
		throw e;
	}
}
