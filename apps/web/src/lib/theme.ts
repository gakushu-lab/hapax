// 画面の配色。"system" は OS の設定に従う
export type ThemeMode = "light" | "dark" | "system";

// index.html の先頭のスクリプトも同じ名前で読む
export const THEME_STORAGE_KEY = "hapax-theme";

const darkQuery = "(prefers-color-scheme: dark)";

export function nextMode(mode: ThemeMode): ThemeMode {
	return mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
}

export function loadMode(): ThemeMode {
	try {
		const value = localStorage.getItem(THEME_STORAGE_KEY);
		if (value === "light" || value === "dark") return value;
	} catch {
		// プライベートブラウズなどで読めないときは OS の設定に従う
	}
	return "system";
}

export function saveMode(mode: ThemeMode): void {
	try {
		if (mode === "system") localStorage.removeItem(THEME_STORAGE_KEY);
		else localStorage.setItem(THEME_STORAGE_KEY, mode);
	} catch {
		// 保存できなくても、開いている間は切り替わる
	}
}

export function resolveMode(mode: ThemeMode): "light" | "dark" {
	if (mode !== "system") return mode;
	return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

// <html data-theme="..."> を書き換える。配色は index.css がこの属性で切り替える
export function applyMode(mode: ThemeMode): void {
	const resolved = resolveMode(mode);
	document.documentElement.dataset.theme = resolved;
	document.documentElement.style.colorScheme = resolved;
}

// OS の設定が変わったら呼ぶ。戻り値で登録を外す
export function onSystemChange(listener: () => void): () => void {
	const query = window.matchMedia(darkQuery);
	query.addEventListener("change", listener);
	return () => query.removeEventListener("change", listener);
}
