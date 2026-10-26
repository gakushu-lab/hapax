// ブラウザと API (Lambda) の両方から参照する型

export const MAX_DOWNLOADS = 10;
export const MAX_EXPIRES_IN = 7 * 24 * 60 * 60; // 7日 (秒)
export const MAX_SIZE = 100 * 1024 * 1024; // 100MiB (研修環境の料金の上限に合わせる)

export type CreateUploadRequest = {
	meta: string; // 暗号化したファイル情報 (base64url)
	size: number; // 暗号文のバイト数
	expiresIn: number; // 保存期間 (秒)
	maxDownloads: number;
	turnstileToken: string;
};

export type CreateUploadResponse = {
	id: string;
	uploadUrl: string;
};

export type DownloadInfo = {
	meta: string;
	size: number;
	remaining: number;
	expiresAt: number; // UNIX 時刻 (ミリ秒)
};

export type ConsumeResponse = {
	downloadUrl: string;
};

export type ApiError = {
	error: string;
};
