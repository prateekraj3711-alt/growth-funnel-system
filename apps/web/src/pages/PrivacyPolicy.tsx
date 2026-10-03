import { StaticPage } from "./StaticPage";

const PRIVACY_POLICY_VERSION = import.meta.env.VITE_PRIVACY_POLICY_VERSION ?? "1.0.0";

// Demo content for a take-home assignment — not real legal copy. It exists
// so the consent checkbox links somewhere real, and so what-goes-where is
// stated plainly rather than only living in SUBMISSION.md.
export function PrivacyPolicy(): JSX.Element {
  return (
    <StaticPage title="Privacy Policy">
      <p className="text-xs text-slate-400">Version {PRIVACY_POLICY_VERSION} — sample policy for demonstration purposes.</p>
      <p>
        When you complete this eligibility check, we collect the answers you give, the contact
        details you provide (name, email, phone), and standard web attribution data (which ad or
        link brought you here, your browser&apos;s Meta click identifiers, and your IP address).
      </p>
      <h2 className="mt-4 font-semibold text-slate-900">What we do with it</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your contact details and qualification answers are stored so a team member can follow up.</li>
        <li>
          Your name, email and phone are one-way hashed (SHA-256) before being sent to Meta, solely to
          measure ad performance and improve targeting — Meta never receives your qualification
          answers or any raw, unhashed contact details from this flow.
        </li>
        <li>Your contact details and qualification answers are synced to our operational CRM (Airtable) for follow-up.</li>
      </ul>
      <h2 className="mt-4 font-semibold text-slate-900">Your choices</h2>
      <p>
        Submitting the form is optional at every step — closing the page at any point discards
        whatever you&apos;ve entered so far except what was already submitted.
      </p>
    </StaticPage>
  );
}
