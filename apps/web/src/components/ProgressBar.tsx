interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps): JSX.Element {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div
      className="h-1.5 w-full bg-slate-100"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Step ${current} of ${total}`}
    >
      <div
        className="h-full bg-indigo-600 transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
