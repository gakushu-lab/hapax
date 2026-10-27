import { Link } from "../components/dads/Link";

export function NotFoundPage() {
	return (
		<>
			<h1 className="mb-6 text-std-28B-150">ページが見つかりません</h1>
			<p>
				<Link href="/">ファイルを送る画面へ移動する</Link>
			</p>
		</>
	);
}
