import { useId } from "react";
import { ProgressIndicator, ProgressIndicatorLinear } from "./dads/ProgressIndicator";

export function Progress({ label, ratio }: { label: string; ratio: number }) {
	const labelId = useId();
	const percent = Math.round(ratio * 100);
	return (
		<ProgressIndicator type="stacked" value={percent} aria-labelledby={labelId}>
			<ProgressIndicatorLinear size="lg" />
			<span id={labelId}>
				{label} {percent}%
			</span>
		</ProgressIndicator>
	);
}
