import type { ReactNode } from "react";

export function StaticPage({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-12 text-slate-700">
      <a href="/" className="mb-8 inline-block text-sm text-indigo-600 underline">
        ← Back to the eligibility check
      </a>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{title}</h1>
      <div className="flex flex-col gap-4 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
