import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ConsentData, CreateLeadRequest, LeadContact, QualificationData } from "@growth-funnel/shared";
import { getCurrentTracking, getFirstTouchAttribution } from "../lib/attribution";
import { submitLead } from "../lib/api";
import { trackLead, trackQualificationCompleted, trackQualificationStarted } from "../lib/metaPixel";
import { funnelReducer, initialFunnelState } from "./state";

interface SubmissionIds {
  eventId: string;
  idempotencyKey: string;
}

export function useFunnel() {
  const [state, dispatch] = useReducer(funnelReducer, initialFunnelState);
  const hasStartedRef = useRef(false);
  const hasFiredCompletedRef = useRef(false);

  // One (eventId, idempotencyKey) pair per funnel session, generated once and
  // kept in memory for the lifetime of this component — NOT persisted to
  // sessionStorage. That was tried and is actively harmful: consentTimestamp
  // is regenerated on every submit, so a stale persisted key from an earlier
  // (even successful) submission collides with a genuinely new attempt's
  // different body and trips the "Idempotency-Key reused with a different
  // body" 409 — observed live. A page refresh loses all the funnel's
  // answers anyway, so persisting just the ids across reloads never actually
  // protected anything; an in-memory ref correctly covers the real case
  // (retrying the same failed submit without navigating away) while a fresh
  // page load — which can only mean a fresh attempt — gets fresh ids. See
  // README.md "Idempotency".
  const submissionIdsRef = useRef<SubmissionIds | null>(null);
  if (!submissionIdsRef.current) {
    submissionIdsRef.current = { eventId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() };
  }

  const answerStep = useCallback(
    (stepId: keyof QualificationData, value: boolean, disqualifies: boolean) => {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        trackQualificationStarted();
      }
      dispatch({ type: "ANSWER_STEP", stepId, value, disqualifies });
    },
    [],
  );

  const goBack = useCallback(() => dispatch({ type: "GO_BACK" }), []);

  // QualificationCompleted fires once, the moment all required questions
  // are answered and the funnel reaches the contact step — a real
  // micro-conversion, well short of the canonical Lead event.
  useEffect(() => {
    if (state.phase === "contact" && !hasFiredCompletedRef.current) {
      hasFiredCompletedRef.current = true;
      trackQualificationCompleted();
    }
  }, [state.phase]);

  const submitContact = useCallback(
    async (contact: LeadContact, consent: ConsentData) => {
      dispatch({ type: "SUBMIT_START" });

      const { eventId, idempotencyKey } = submissionIdsRef.current!;
      const firstTouch = getFirstTouchAttribution();
      const tracking = getCurrentTracking(firstTouch);

      const body: CreateLeadRequest = {
        eventId,
        lead: contact,
        qualification: state.answers,
        attribution: firstTouch,
        tracking,
        consent,
      };

      try {
        const result = await submitLead(body, idempotencyKey);
        if (result.success) {
          // Canonical Lead conversion — fires ONLY here, after the backend
          // has confirmed persistence, using the same event_id the server
          // will use for its own CAPI copy of this conversion.
          trackLead(result.eventId);
          dispatch({ type: "SUBMIT_SUCCESS", leadId: result.leadId });
        } else {
          dispatch({ type: "SUBMIT_ERROR", message: result.error.message });
        }
      } catch {
        dispatch({
          type: "SUBMIT_ERROR",
          message: "Network error. Please check your connection and try again.",
        });
      }
    },
    [state.answers],
  );

  return { state, answerStep, goBack, submitContact };
}
