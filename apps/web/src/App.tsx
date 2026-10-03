import { useEffect } from "react";
import { QUALIFICATION_STEPS } from "@growth-funnel/shared";
import { ContactForm } from "./components/ContactForm";
import { DisqualifiedScreen } from "./components/DisqualifiedScreen";
import { FunnelShell } from "./components/FunnelShell";
import { QualificationStep } from "./components/QualificationStep";
import { SuccessScreen } from "./components/SuccessScreen";
import { useFunnel } from "./funnel/useFunnel";
import { initMetaPixel, trackPageView } from "./lib/metaPixel";

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;
const TOTAL_STEPS = QUALIFICATION_STEPS.length + 1; // qualification questions + contact

export default function App(): JSX.Element {
  const { state, answerStep, goBack, submitContact } = useFunnel();

  useEffect(() => {
    initMetaPixel(META_PIXEL_ID);
    trackPageView();
  }, []);

  if (state.phase === "disqualified") {
    return (
      <FunnelShell>
        <DisqualifiedScreen />
      </FunnelShell>
    );
  }

  if (state.phase === "success") {
    return (
      <FunnelShell>
        <SuccessScreen leadId={state.submission.leadId ?? ""} />
      </FunnelShell>
    );
  }

  const currentStep = QUALIFICATION_STEPS[state.stepIndex];
  const currentStepNumber =
    state.phase === "qualification" ? state.stepIndex + 1 : QUALIFICATION_STEPS.length + 1;
  const canGoBack = state.phase === "contact" || (state.phase === "qualification" && state.stepIndex > 0);

  return (
    <FunnelShell
      onBack={canGoBack ? goBack : undefined}
      progress={{ current: currentStepNumber, total: TOTAL_STEPS }}
    >
      {state.phase === "qualification" && currentStep ? (
        <QualificationStep
          key={currentStep.id}
          step={currentStep}
          direction={state.direction}
          onAnswer={(value, disqualifies) => answerStep(currentStep.id, value, disqualifies)}
        />
      ) : (
        <ContactForm
          key="contact"
          onSubmit={submitContact}
          isSubmitting={state.submission.status === "submitting"}
          errorMessage={state.submission.status === "error" ? state.submission.errorMessage : undefined}
        />
      )}
    </FunnelShell>
  );
}
