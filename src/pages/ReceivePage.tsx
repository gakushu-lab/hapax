import { useEffect, useState } from "react";
import type { DownloadInfo } from "../../shared/api";
import { Progress } from "../components/Progress";
import { Button } from "../components/dads/Button";
import { Link } from "../components/dads/Link";
import { NotificationBanner, NotificationBannerBody } from "../components/dads/NotificationBanner";
import {
	ProgressIndicator,
	ProgressIndicatorSpinner,
} from "../components/dads/ProgressIndicator";
import { ApiRequestError, consumeDownload, getDownload } from "../lib/api";
import { decryptMeta, decryptStream, deriveKeys, type FileMeta, type Keys } from "../lib/crypto";
import { parseFragment } from "../lib/fragment";
import { formatBytes, formatDateTime } from "../lib/format";

type Phase =
	| { kind: "loading" }
	| { kind: "invalid_link" }
	| { kind: "not_found" }
	| { kind: "gone" }
	| { kind: "failed"; message: string }
	| { kind: "ready"; info: DownloadInfo; keys: Keys; meta: FileMeta }
	| { kind: "downloading"; ratio: number; meta: FileMeta }
	| { kind: "done"; meta: FileMeta };

function saveBlob(blob: Blob, name: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function Unavailable({ title, message }: { title: string; message: string }) {
	return (
		<>
			<h1 className="mb-6 text-std-28B-150">ファイルを受け取る</h1>
			<NotificationBanner bannerStyle="standard" type="error" title={title}>
				<NotificationBannerBody>
					<p>{message}</p>
					<p>
						<Link href="/">自分でファイルを送る場合はこちら</Link>
					</p>
				</NotificationBannerBody>
			</NotificationBanner>
		</>
	);
}

export function ReceivePage({ id }: { id: string }) {
	const [secret] = useState(() => parseFragment(window.location.hash));
	const [phase, setPhase] = useState<Phase>(
		secret ? { kind: "loading" } : { kind: "invalid_link" },
	);

	useEffect(() => {
		if (!secret) return;
		(async () => {
			try {
				const info = await getDownload(id);
				const keys = await deriveKeys(secret);
				const meta = await decryptMeta(keys.meta, info.meta).catch(() => null);
				if (!meta) {
					setPhase({ kind: "invalid_link" });
					return;
				}
				setPhase({ kind: "ready", info, keys, meta });
			} catch (e) {
				if (e instanceof ApiRequestError && e.status === 404) setPhase({ kind: "not_found" });
				else if (e instanceof ApiRequestError && e.status === 410) setPhase({ kind: "gone" });
				else setPhase({ kind: "failed", message: "時間をおいて画面を再読み込みしてください。" });
			}
		})();
	}, [id, secret]);

	async function download(info: DownloadInfo, keys: Keys, meta: FileMeta) {
		setPhase({ kind: "downloading", ratio: 0, meta });
		try {
			const { downloadUrl } = await consumeDownload(id);
			const res = await fetch(downloadUrl);
			if (!res.ok || !res.body) throw new Error("fetch_failed");
			const blob = await decryptStream(keys.content, res.body, info.size, (ratio) =>
				setPhase({ kind: "downloading", ratio, meta }),
			);
			saveBlob(new Blob([blob], { type: meta.type }), meta.name);
			setPhase({ kind: "done", meta });
		} catch (e) {
			if (e instanceof ApiRequestError && e.status === 410) setPhase({ kind: "gone" });
			else
				setPhase({
					kind: "failed",
					message: "ダウンロードまたは復号に失敗しました。送った人に URL を発行し直してもらってください。",
				});
		}
	}

	switch (phase.kind) {
		case "loading":
			return (
				<ProgressIndicator type="stacked" aria-label="読み込み中">
					<ProgressIndicatorSpinner size="lg" />
					<span>読み込み中</span>
				</ProgressIndicator>
			);
		case "invalid_link":
			return (
				<Unavailable
					title="URL が正しくありません"
					message="URL の # 以降が欠けているか、書き換えられています。送った人から届いた URL を全部コピーして開いてください。"
				/>
			);
		case "not_found":
			return (
				<Unavailable
					title="ファイルが見つかりません"
					message="すでに削除されたか、URL が間違っています。送った人に確認してください。"
				/>
			);
		case "gone":
			return (
				<Unavailable
					title="ファイルは削除されました"
					message="保存期間を過ぎたか、ダウンロードできる回数に達しました。送った人にもう一度送ってもらってください。"
				/>
			);
		case "failed":
			return <Unavailable title="エラーが発生しました" message={phase.message} />;
	}

	const meta = phase.meta;
	return (
		<>
			<h1 className="mb-6 text-std-28B-150">ファイルを受け取る</h1>
			<dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
				<dt className="text-std-16B-170">ファイル名</dt>
				<dd className="break-all">{meta.name}</dd>
				<dt className="text-std-16B-170">サイズ</dt>
				<dd>{formatBytes(meta.size)}</dd>
				{phase.kind === "ready" && (
					<>
						<dt className="text-std-16B-170">残りの回数</dt>
						<dd>{phase.info.remaining}回</dd>
						<dt className="text-std-16B-170">削除される日時</dt>
						<dd>{formatDateTime(phase.info.expiresAt)}</dd>
					</>
				)}
			</dl>

			{phase.kind === "ready" && (
				<Button
					size="lg"
					variant="solid-fill"
					type="button"
					onClick={() => download(phase.info, phase.keys, phase.meta)}
				>
					ダウンロード
				</Button>
			)}
			{phase.kind === "downloading" && <Progress label="受信して復号しています" ratio={phase.ratio} />}
			{phase.kind === "done" && (
				<NotificationBanner bannerStyle="standard" type="success" title="ダウンロードしました">
					<NotificationBannerBody>
						保存先のフォルダを確認してください。
					</NotificationBannerBody>
				</NotificationBanner>
			)}
		</>
	);
}
