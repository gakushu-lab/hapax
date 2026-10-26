import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
	return (
		<>
			<header className="border-b border-solid-gray-100">
				<div className="mx-auto max-w-[calc(720/16*1rem)] px-4 py-4">
					<a href="/" className="text-std-20B-150 text-solid-gray-900 no-underline">
						hapax
					</a>
				</div>
			</header>
			<main className="mx-auto max-w-[calc(720/16*1rem)] px-4 py-8">{children}</main>
		</>
	);
}
