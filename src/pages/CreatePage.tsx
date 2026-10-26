import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useCallback, useId, useState, type FormEvent } from "react";
import { MAX_SIZE } from "../../shared/api";
import { Progress } from "../components/Progress";
import { Turnstile } from "../components/Turnstile";
import {
	Button,
	buttonBaseStyle,
	buttonSizeStyle,
	buttonVariantStyle,
} from "../components/dads/Button";
import { ErrorText } from "../components/dads/ErrorText";
import { Input } from "../components/dads/Input";
import { Label } from "../components/dads/Label";
import { Link } from "../components/dads/Link";
import { NotificationBanner, NotificationBannerBody } from "../components/dads/NotificationBanner";
import { RequirementBadge } from "../components/dads/RequirementBadge";
import { Select } from "../components/dads/Select";
import { SupportText } from "../components/dads/SupportText";
import { ApiRequestError, completeUpload, createUpload, putBlob } from "../lib/api";
import {
	deriveKeys,
	encryptFile,
	encryptMeta,
	encryptedSize,
	generateSecret,
} from "../lib/crypto";
import { buildFragment } from "../lib/fragment";
import { formatBytes } from "../lib/format";

const EXPIRES_OPTIONS = [
	{ value: 60 * 60, label: "1時間" },
	{ value: 24 * 60 * 60, label: "1日" },
	{ value: 3 * 24 * 60 * 60, label: "3日" },
	{ value: 7 * 24 * 60 * 60, label: "7日" },
];
const DOWNLOAD_OPTIONS = [1, 2, 3, 5, 10];

type Phase =
	| { kind: "input" }
	| { kind: "encrypting"; ratio: number }
	| { kind: "uploading"; ratio: number }
	| { kind: "done"; url: string }
	| { kind: "failed"; message: string };

function errorMessage(e: unknown): string {
	if (e instanceof ApiRequestError) {
		if (e.status === 429) return "短時間に送信が集中しています。1分ほど待ってから送り直してください。";
		if (e.status === 403) return "送信者の確認に失敗しました。画面を再読み込みしてから送り直してください。";
		if (e.status === 0) return "通信に失敗しました。接続を確認してから送り直してください。";
	}
	return "送信に失敗しました。時間をおいて送り直してください。";
}

export function CreatePage() {
	const fileId = useId();
	const expiresId = useId();
	const downloadsId = useId();
	const [file, setFile] = useState<File | null>(null);
	const [fileError, setFileError] = useState("");
	const [expiresIn, setExpiresIn] = useState(EXPIRES_OPTIONS[1].value);
	const [maxDownloads, setMaxDownloads] = useState(1);
	const [token, setToken] = useState<string | null>(null);
	const [phase, setPhase] = useState<Phase>({ kind: "input" });
	const [copied, setCopied] = useState(false);
	const [copyFailed, setCopyFailed] = useState(false);
	const onToken = useCallback((t: string) => setToken(t), []);

	const busy = phase.kind === "encrypting" || phase.kind === "uploading";

	async function submit(e: FormEvent) {
		e.preventDefault();
		if (busy || token === null) return;
		if (!file) {
			setFileError("ファイルを選択してください。");
			return;
		}
		if (encryptedSize(file.size) > MAX_SIZE) {
			setFileError(`${formatBytes(MAX_SIZE)} 以下のファイルを選択してください。`);
			return;
		}
		setFileError("");

		try {
			const secret = generateSecret();
			const keys = await deriveKeys(secret);

			setPhase({ kind: "encrypting", ratio: 0 });
			const cipher = await encryptFile(keys.content, file, (ratio) =>
				setPhase({ kind: "encrypting", ratio }),
			);
			const meta = await encryptMeta(keys.meta, {
				name: file.name,
				type: file.type,
				size: file.size,
			});

			const { id, uploadUrl } = await createUpload({
				meta,
				size: cipher.size,
				expiresIn,
				maxDownloads,
				turnstileToken: token ?? "",
			});
			setPhase({ kind: "uploading", ratio: 0 });
			await putBlob(uploadUrl, cipher, (ratio) => setPhase({ kind: "uploading", ratio }));
			await completeUpload(id);

			const url = `${window.location.origin}/d/${id}#${buildFragment(secret)}`;
			setPhase({ kind: "done", url });
		} catch (err) {
			setPhase({ kind: "failed", message: errorMessage(err) });
		}
	}

	async function copy(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
		} catch {
			// ブラウザがクリップボードへの書き込みを許可しないときは、手でコピーしてもらう
			setCopyFailed(true);
		}
	}

	if (phase.kind === "done") {
		return (
			<>
				<h1 className="mb-6 text-std-28B-150">URL を発行しました</h1>
				<div className="grid gap-2">
					<Label htmlFor="result-url">受け取る人に送る URL</Label>
					<SupportText>
						この URL を知っている人は誰でもダウンロードできます。受け取る人以外に見せないでください。
					</SupportText>
					<div className="flex flex-wrap gap-2">
						<Input id="result-url" readOnly value={phase.url} className="w-full" />
						<Button
							size="md"
							variant="outline"
							type="button"
							onClick={() => copy(phase.url)}
							className="inline-flex items-center gap-2"
						>
							{/* コピーできたことを文言とアイコンの両方で示す */}
							{copied ? (
								<CheckIcon size={18} weight="regular" aria-hidden />
							) : (
								<CopyIcon size={18} weight="regular" aria-hidden />
							)}
							{copied ? "コピーしました" : "URL をコピー"}
						</Button>
					</div>
					{copyFailed && (
						<ErrorText>コピーできませんでした。URL の欄を選択してコピーしてください。</ErrorText>
					)}
				</div>
				<p className="mt-8">
					<Link href="/">別のファイルを送る</Link>
				</p>
			</>
		);
	}

	return (
		<>
			<h1 className="mb-6 text-std-28B-150">ファイルを送る</h1>

			{phase.kind === "failed" && (
				<NotificationBanner
					className="mb-6"
					bannerStyle="standard"
					type="error"
					title="送信できませんでした"
				>
					<NotificationBannerBody>{phase.message}</NotificationBannerBody>
				</NotificationBanner>
			)}

			<form onSubmit={submit} className="grid gap-8" noValidate>
				<div className="grid gap-2">
					<Label htmlFor={fileId}>
						ファイル<RequirementBadge>※必須</RequirementBadge>
					</Label>
					<SupportText id={`${fileId}-support`}>
						ブラウザ内で暗号化してから送ります。サーバーはファイル名も中身も読めません。
					</SupportText>
					<div className="flex flex-wrap items-center gap-4">
						{/* ブラウザ標準の表示は英語になることがあるので、入力欄を隠してボタン風の label で開く */}
						<input
							id={fileId}
							type="file"
							aria-describedby={`${fileId}-support${fileError ? ` ${fileId}-error` : ""}`}
							aria-invalid={fileError ? true : undefined}
							disabled={busy}
							onChange={(e) => setFile(e.target.files?.[0] ?? null)}
							className="peer sr-only"
						/>
						<label
							htmlFor={fileId}
							className={`${buttonBaseStyle} ${buttonSizeStyle.md} ${buttonVariantStyle.outline} cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-4 peer-focus-visible:outline-black peer-focus-visible:outline-offset-[calc(2/16*1rem)] peer-focus-visible:ring-[calc(2/16*1rem)] peer-focus-visible:ring-yellow-300`}
						>
							ファイルを選択
						</label>
						<span className="break-all">
							{file ? `${file.name} (${formatBytes(file.size)})` : "選択されていません"}
						</span>
					</div>
					{fileError && <ErrorText id={`${fileId}-error`}>{fileError}</ErrorText>}
				</div>

				<div className="grid gap-2">
					<Label htmlFor={expiresId}>保存期間</Label>
					<SupportText id={`${expiresId}-support`}>
						期間を過ぎると、ダウンロードされていなくても削除します。
					</SupportText>
					<Select
						id={expiresId}
						aria-describedby={`${expiresId}-support`}
						value={expiresIn}
						disabled={busy}
						onChange={(e) => setExpiresIn(Number(e.target.value))}
					>
						{EXPIRES_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</Select>
				</div>

				<div className="grid gap-2">
					<Label htmlFor={downloadsId}>ダウンロードできる回数</Label>
					<SupportText id={`${downloadsId}-support`}>
						回数に達すると削除します。
					</SupportText>
					<Select
						id={downloadsId}
						aria-describedby={`${downloadsId}-support`}
						value={maxDownloads}
						disabled={busy}
						onChange={(e) => setMaxDownloads(Number(e.target.value))}
					>
						{DOWNLOAD_OPTIONS.map((n) => (
							<option key={n} value={n}>
								{n}回
							</option>
						))}
					</Select>
				</div>

				<Turnstile onToken={onToken} />

				{phase.kind === "encrypting" && <Progress label="暗号化しています" ratio={phase.ratio} />}
				{phase.kind === "uploading" && <Progress label="送信しています" ratio={phase.ratio} />}

				<Button
					size="lg"
					variant="solid-fill"
					type="submit"
					aria-disabled={busy || token === null}
				>
					暗号化して URL を発行
				</Button>
			</form>
		</>
	);
}
