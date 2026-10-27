// Lambda の環境変数 (ローカルでは api/local.env) から設定を読む
export type Config = {
	devMode: boolean;
	tableName: string;
	bucketName: string;
	s3ForcePathStyle: boolean;
};

export function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`環境変数 ${name} がありません`);
	return value;
}

export function config(): Config {
	return {
		devMode: process.env.DEV_MODE === "true",
		tableName: required("TABLE_NAME"),
		bucketName: required("BUCKET_NAME"),
		s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
	};
}
