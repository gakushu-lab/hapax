import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "./dads/Button";
import { applyMode, loadMode, nextMode, onSystemChange, saveMode, type ThemeMode } from "../lib/theme";

const labels: Record<ThemeMode, string> = {
	light: "ライト",
	dark: "ダーク",
	system: "OS に合わせる",
};

const icons = { light: SunIcon, dark: MoonIcon, system: MonitorIcon };

// 押すたびに ライト → ダーク → OS に合わせる の順で切り替える
export function ThemeToggle() {
	const [mode, setMode] = useState<ThemeMode>(loadMode);

	useEffect(() => {
		applyMode(mode);
		if (mode !== "system") return;
		return onSystemChange(() => applyMode("system"));
	}, [mode]);

	function toggle() {
		const next = nextMode(mode);
		saveMode(next);
		setMode(next);
	}

	const Icon = icons[mode];
	return (
		<Button
			size="sm"
			variant="text"
			type="button"
			onClick={toggle}
			aria-label={`表示モード: ${labels[mode]}。押すと${labels[nextMode(mode)]}に切り替える`}
			className="inline-flex items-center gap-2"
		>
			<Icon size={18} weight="regular" aria-hidden />
			{labels[mode]}
		</Button>
	);
}
