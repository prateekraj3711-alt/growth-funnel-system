import { QUALIFICATION_STEPS, type QualificationData } from "@growth-funnel/shared";

export type FunnelPhase = "qualification" | "contact" | "success" | "disqualified";

export interface SubmissionState {
  status: "idle" | "submitting" | "success" | "error";
  leadId?: string;
  errorMessage?: string;
}

export interface FunnelState {
  phase: FunnelPhase;
  stepIndex: number;
  answers: QualificationData;
  /** Drives which CSS transition plays for the next step render. */
  direction: 1 | -1;
  submission: SubmissionState;
}

export type FunnelAction =
  | { type: "ANSWER_STEP"; stepId: keyof QualificationData; value: boolean; disqualifies: boolean }
  | { type: "GO_BACK" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS"; leadId: string }
  | { type: "SUBMIT_ERROR"; message: string };

export const initialFunnelState: FunnelState = {
  phase: "qualification",
  stepIndex: 0,
  answers: {},
  direction: 1,
  submission: { status: "idle" },
};

export function funnelReducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case "ANSWER_STEP": {
      const answers = { ...state.answers, [action.stepId]: action.value };

      if (action.disqualifies) {
        return { ...state, answers, phase: "disqualified", direction: 1 };
      }

      const nextIndex = state.stepIndex + 1;
      const qualificationComplete = nextIndex >= QUALIFICATION_STEPS.length;
      return {
        ...state,
        answers,
        stepIndex: nextIndex,
        phase: qualificationComplete ? "contact" : "qualification",
        direction: 1,
      };
    }

    case "GO_BACK": {
      if (state.phase === "contact") {
        return {
          ...state,
          phase: "qualification",
          stepIndex: QUALIFICATION_STEPS.length - 1,
          direction: -1,
        };
      }
      if (state.phase === "qualification" && state.stepIndex > 0) {
        return { ...state, stepIndex: state.stepIndex - 1, direction: -1 };
      }
      return state;
    }

    case "SUBMIT_START":
      return { ...state, submission: { status: "submitting" } };

    case "SUBMIT_SUCCESS":
      return {
        ...state,
        phase: "success",
        submission: { status: "success", leadId: action.leadId },
      };

    case "SUBMIT_ERROR":
      return { ...state, submission: { status: "error", errorMessage: action.message } };

    default:
      return state;
  }
}
