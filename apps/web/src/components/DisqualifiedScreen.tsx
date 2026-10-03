import { InfoIcon } from "./Icons";

export function DisqualifiedScreen(): JSX.Element {
  return (
    <div className="step-forward w-full text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <InfoIcon />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-slate-900">This program may not be the right fit</h1>
      <p className="mb-8 text-slate-500">
        Based on your answers, you don&apos;t appear to meet the criteria for this particular
        program. This isn&apos;t a legal determination of eligibility — only the relevant agency can
        make that call.
      </p>
      <a
        href="https://www.ssa.gov"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
      >
        Visit SSA.gov to learn more
      </a>
    </div>
  );
}
