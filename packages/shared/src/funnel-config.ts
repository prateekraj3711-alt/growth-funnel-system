import type { FunnelStep } from "./types.js";

/** The qualification micro-steps, in order. Adding, editing, reordering or
 * removing a question is a one-line change here — no component touches
 * question text or branching logic directly. */
export const QUALIFICATION_STEPS: FunnelStep[] = [
  {
    id: "ageOver40",
    dlKey: "qual_age_over_40",
    question: "Are you 40 years of age or older?",
    type: "boolean",
    required: true,
    options: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
    disqualifyingValues: ["false"],
  },
  {
    id: "receivesBenefits",
    dlKey: "qual_receives_benefits",
    question: "Are you currently receiving Social Security or disability benefits?",
    type: "boolean",
    required: true,
    options: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
  },
  {
    id: "employed",
    dlKey: "qual_currently_employed",
    question: "Are you currently working?",
    type: "boolean",
    required: true,
    options: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
  },
  {
    id: "conditionLimitsWork",
    dlKey: "qual_condition_limits_work",
    question: "Does a medical condition limit your ability to work?",
    type: "boolean",
    required: true,
    options: [
      { label: "Yes", value: "true" },
      { label: "No", value: "false" },
    ],
    disqualifyingValues: ["false"],
  },
];

export const TOTAL_FUNNEL_STEPS = QUALIFICATION_STEPS.length + 1; // + contact step
