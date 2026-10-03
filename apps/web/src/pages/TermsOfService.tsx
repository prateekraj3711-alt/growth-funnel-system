import { StaticPage } from "./StaticPage";

// Demo content for a take-home assignment — not real legal copy.
export function TermsOfService(): JSX.Element {
  return (
    <StaticPage title="Terms of Use">
      <p>
        This eligibility check is a free, informational tool. It is not legal, medical, or financial
        advice, and completing it does not guarantee eligibility for any program.
      </p>
      <p>
        By submitting your information, you consent to being contacted about the results of this
        check, as described in our{" "}
        <a href="/privacy" className="text-indigo-600 underline">
          Privacy Policy
        </a>
        .
      </p>
    </StaticPage>
  );
}
