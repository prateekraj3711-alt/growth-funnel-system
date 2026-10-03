import type { FunnelStep } from "@growth-funnel/shared";

interface QualificationStepProps {
  step: FunnelStep;
  direction: 1 | -1;
  onAnswer: (value: boolean, disqualifies: boolean) => void;
}

export function QualificationStep({ step, direction, onAnswer }: QualificationStepProps): JSX.Element {
  return (
    <div className={`w-full ${direction === 1 ? "step-forward" : "step-back"}`}>
      <h1 className="mb-8 text-center text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
        {step.question}
      </h1>
      <div className="flex flex-col gap-3" role="group" aria-label={step.question}>
        {step.options?.map((option) => {
          const value = option.value === "true";
          const disqualifies = step.disqualifyingValues?.includes(option.value) ?? false;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(value, disqualifies)}
              className="min-h-16 w-full rounded-2xl border-2 border-slate-200 bg-white px-6 text-lg font-semibold text-slate-900 shadow-sm transition active:scale-[0.98] hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
