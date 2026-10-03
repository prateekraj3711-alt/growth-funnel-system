import type { ReactNode } from "react";
import { ArrowLeftIcon } from "./Icons";
import { ProgressBar } from "./ProgressBar";

interface FunnelShellProps {
  onBack?: () => void;
  progress?: { current: number; total: number };
  children: ReactNode;
}

export function FunnelShell({ onBack, progress, children }: FunnelShellProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center px-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="-ml-2 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ArrowLeftIcon />
            </button>
          ) : (
            <span className="w-9" aria-hidden="true" />
          )}
          <span className="flex-1 text-center text-sm font-semibold text-slate-900">
            Benefits Eligibility Check
          </span>
          <span className="w-9" aria-hidden="true" />
        </div>
        {progress ? <ProgressBar current={progress.current} total={progress.total} /> : null}
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 py-10 sm:py-14">
        {children}
      </main>
      <footer className="pb-6 text-center text-xs text-slate-400">
        <a href="/privacy" className="underline">
          Privacy policy
        </a>
        <span className="mx-2">·</span>
        <a href="/terms" className="underline">
          Terms
        </a>
      </footer>
    </div>
  );
}
