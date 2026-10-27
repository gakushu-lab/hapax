import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Layout({ children }: { children: ReactNode }) {
	return (
		<>
			{/* スクロールしてもヘッダーを上に残す */}
			<header className="sticky top-0 z-10 border-b border-solid-gray-100 bg-white">
				<div className="mx-auto flex max-w-[calc(720/16*1rem)] items-center justify-between px-4 py-3">
					<a href="/" className="text-std-20B-150 text-solid-gray-900 no-underline">
						hapax
					</a>
					<ThemeToggle />
				</div>
			</header>
			<main className="mx-auto max-w-[calc(720/16*1rem)] px-4 py-8">{children}</main>
		</>
	);
}
