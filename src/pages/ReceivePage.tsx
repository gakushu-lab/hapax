// 中身は #3 で書く
export function ReceivePage({ id }: { id: string }) {
	return (
		<>
			<h1 className="mb-6 text-std-28B-150">ファイルを受け取る</h1>
			<p>{id}</p>
		</>
	);
}
