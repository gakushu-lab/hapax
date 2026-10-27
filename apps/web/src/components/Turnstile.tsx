import { useEffect, useRef } from "react";

type TurnstileApi = {
	render: (
		el: HTMLElement,
		options: { sitekey: string; callback: (token: string) => void; language: string },
	) => string;
	remove: (widgetId: string) => void;
};

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<TurnstileApi> {
	return new Promise((resolve, reject) => {
		if (window.turnstile) return resolve(window.turnstile);
		const script = document.createElement("script");
		script.src = SCRIPT_URL;
		script.async = true;
		script.onload = () => resolve(window.turnstile!);
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

// サイトキーが無い開発環境では何も描画せず、空のトークンを渡す
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!SITE_KEY) {
			onToken("");
			return;
		}
		let widgetId: string | undefined;
		let api: TurnstileApi | undefined;
		loadScript().then((loaded) => {
			api = loaded;
			if (ref.current) {
				widgetId = api.render(ref.current, {
					sitekey: SITE_KEY,
					callback: onToken,
					language: "ja",
				});
			}
		});
		return () => {
			if (api && widgetId) api.remove(widgetId);
		};
	}, [onToken]);

	return SITE_KEY ? <div ref={ref} /> : null;
}
