import { CheckIcon } from "./Icons";

interface SuccessScreenProps {
  leadId: string;
}

export function SuccessScreen({ leadId }: SuccessScreenProps): JSX.Element {
  return (
    <div className="step-forward w-full text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckIcon />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-slate-900">
        Thanks — your information has been received
      </h1>
      <p className="mb-2 text-slate-500">
        We&apos;ve recorded your answers and contact details. A member of our team will follow up
        shortly.
      </p>
      <p className="text-xs text-slate-400">Reference: {leadId}</p>
    </div>
  );
}
