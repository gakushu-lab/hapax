import { useEffect, useId, useState, type FormEvent } from "react";
import type { DownloadInfo } from "@hapax/shared/api";
import { Progress } from "../components/Progress";
import { Button } from "../components/dads/Button";
import { ErrorText } from "../components/dads/ErrorText";
import { Input } from "../components/dads/Input";
import { Label } from "../components/dads/Label";
import { Link } from "../components/dads/Link";
import { NotificationBanner, NotificationBannerBody } from "../components/dads/NotificationBanner";
import {
	ProgressIndicator,
	ProgressIndicatorSpinner,
} from "../components/dads/ProgressIndicator";
import { ApiRequestError, consumeDownload, getDownload } from "../lib/api";
import {
	decryptMeta,
	decryptStream,
	deriveKeys,
	unwrapSecret,
	type FileMeta,
	type Keys,
} from "../lib/crypto";
import { parseFragment } from "../lib/fragment";
import { formatBytes, formatDateTime } from "../lib/format";

type Phase =
	| { kind: "loading" }
	| { kind: "invalid_link" }
	| { kind: "not_found" }
	| { kind: "gone" }
	| { kind: "failed"; message: string }
	| { kind: "password"; info: DownloadInfo; error: string; checking: boolean }
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

async function open(secret: Uint8Array<ArrayBuffer>, info: DownloadInfo): Promise<Phase> {
	const keys = await deriveKeys(secret);
	const meta = await decryptMeta(keys.meta, info.meta).catch(() => null);
	if (!meta) return { kind: "invalid_link" };
	return { kind: "ready", info, keys, meta };
}

export function ReceivePage({ id }: { id: string }) {
	const passwordId = useId();
	const [fragment] = useState(() => parseFragment(window.location.hash));
	const [phase, setPhase] = useState<Phase>(
		fragment ? { kind: "loading" } : { kind: "invalid_link" },
	);
	const [password, setPassword] = useState("");

	useEffect(() => {
		if (!fragment) return;
		(async () => {
			try {
				const info = await getDownload(id);
				if (fragment.kind === "password") {
					setPhase({ kind: "password", info, error: "", checking: false });
				} else {
					setPhase(await open(fragment.secret, info));
				}
			} catch (e) {
				if (e instanceof ApiRequestError && e.status === 404) setPhase({ kind: "not_found" });
				else if (e instanceof ApiRequestError && e.status === 410) setPhase({ kind: "gone" });
				else setPhase({ kind: "failed", message: "時間をおいて画面を再読み込みしてください。" });
			}
		})();
	}, [id, fragment]);

	async function submitPassword(e: FormEvent, info: DownloadInfo) {
		e.preventDefault();
		if (fragment?.kind !== "password" || (phase.kind === "password" && phase.checking)) return;
		setPhase({ kind: "password", info, error: "", checking: true });
		try {
			const secret = await unwrapSecret(fragment.wrapped, password);
			setPhase(await open(secret, info));
		} catch {
			setPhase({ kind: "password", info, error: "パスワードが違います。", checking: false });
		}
	}

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
		case "password":
			return (
				<>
					<h1 className="mb-6 text-std-28B-150">ファイルを受け取る</h1>
					<form
						onSubmit={(e) => submitPassword(e, phase.info)}
						className="grid gap-6"
						noValidate
					>
						<div className="grid gap-2">
							<Label htmlFor={passwordId}>パスワード</Label>
							<Input
								id={passwordId}
								type="password"
								autoComplete="off"
								aria-describedby={phase.error ? `${passwordId}-error` : undefined}
								isError={phase.error !== ""}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full"
							/>
							{phase.error && <ErrorText id={`${passwordId}-error`}>{phase.error}</ErrorText>}
						</div>
						<Button size="lg" variant="solid-fill" type="submit" aria-disabled={phase.checking}>
							{phase.checking ? "確認しています" : "開く"}
						</Button>
					</form>
				</>
			);
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
