import type {
	ApiError,
	ConsumeResponse,
	CreateUploadRequest,
	CreateUploadResponse,
	DownloadInfo,
} from "../../shared/api";

export class ApiRequestError extends Error {
	readonly status: number;

	constructor(status: number, code: string) {
		super(code);
		this.status = status;
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(path, {
		...init,
		headers: { "content-type": "application/json", ...init?.headers },
	});
	if (!res.ok) {
		const body = (await res.json().catch(() => ({ error: "unknown" }))) as ApiError;
		throw new ApiRequestError(res.status, body.error);
	}
	if (res.status === 204) return undefined as T;
	return (await res.json()) as T;
}

export function createUpload(body: CreateUploadRequest) {
	return request<CreateUploadResponse>("/api/uploads", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

export function completeUpload(id: string) {
	return request<void>(`/api/uploads/${id}/complete`, { method: "POST" });
}

export function getDownload(id: string) {
	return request<DownloadInfo>(`/api/downloads/${id}`);
}

export function consumeDownload(id: string) {
	return request<ConsumeResponse>(`/api/downloads/${id}/consume`, { method: "POST" });
}

// fetch は送信の進捗を取得できないので XMLHttpRequest を使う
export function putBlob(url: string, blob: Blob, onProgress: (ratio: number) => void) {
	return new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("PUT", url);
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) resolve();
			else reject(new ApiRequestError(xhr.status, "upload_failed"));
		};
		xhr.onerror = () => reject(new ApiRequestError(0, "network_error"));
		xhr.send(blob);
	});
}
