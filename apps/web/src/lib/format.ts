const UNITS = ["B", "KB", "MB", "GB"];

export function formatBytes(bytes: number): string {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
}

export function formatDateTime(epochMs: number): string {
	return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeStyle: "short" }).format(
		epochMs,
	);
}
