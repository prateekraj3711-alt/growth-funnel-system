import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ConsentData, CreateLeadRequest, LeadContact, QualificationData } from "@growth-funnel/shared";
import { getCurrentTracking, getFirstTouchAttribution } from "../lib/attribution";
import { submitLead } from "../lib/api";
import { trackLead, trackQualificationCompleted, trackQualificationStarted } from "../lib/metaPixel";
import { funnelReducer, initialFunnelState } from "./state";

const SUBMISSION_IDS_KEY = "gf_submission_ids_v1";

interface SubmissionIds {
  eventId: string;
  idempotencyKey: string;
}

/**
 * One (eventId, idempotencyKey) pair per funnel attempt, created lazily and
 * persisted to sessionStorage. Reused across every retry of THIS attempt
 * (including a page refresh after a failed submit) so a resubmit can never
 * create a duplicate lead or a duplicate Meta conversion — see
 * README.md "Idempotency".
 */
function getOrCreateSubmissionIds(): SubmissionIds {
  try {
    const existing = sessionStorage.getItem(SUBMISSION_IDS_KEY);
    if (existing) return JSON.parse(existing) as SubmissionIds;
  } catch {
    // fall through
  }

  const ids: SubmissionIds = {
    eventId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
  };
  try {
    sessionStorage.setItem(SUBMISSION_IDS_KEY, JSON.stringify(ids));
  } catch {
    // non-fatal — retries within this page view still share `ids` via the
    // closure below, they just won't survive a reload
  }
  return ids;
}

export function useFunnel() {
  const [state, dispatch] = useReducer(funnelReducer, initialFunnelState);
  const hasStartedRef = useRef(false);
  const hasFiredCompletedRef = useRef(false);

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

      const { eventId, idempotencyKey } = getOrCreateSubmissionIds();
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
