// Meta scope is deliberately narrow here: browser Pixel + the 4 named
// events (PageView, QualificationStarted, QualificationCompleted, Lead).
// No ads/audience/campaign APIs — see SUBMISSION.md "Meta Tracking".

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: FbqFn;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

let initialized = false;

export function initMetaPixel(pixelId: string | undefined): void {
  if (initialized || !pixelId) return;
  initialized = true;

  const w = window;
  const d = document;
  if (w.fbq) return;

  const fbq: FbqFn = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue?.push(args);
    }
  };
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];

  const script = d.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = d.getElementsByTagName("script")[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);

  w.fbq("init", pixelId);
}

export function trackPageView(): void {
  window.fbq?.("track", "PageView");
}

/** Custom event: fires once, on the user's first real interaction with the
 * qualification quiz (not merely landing on the page). */
export function trackQualificationStarted(): void {
  window.fbq?.("trackCustom", "QualificationStarted");
}

/** Custom event: fires once all qualification questions are answered and
 * the user reaches the contact step — a real micro-conversion signal,
 * distinct from (and well short of) the canonical Lead event. */
export function trackQualificationCompleted(): void {
  window.fbq?.("trackCustom", "QualificationCompleted");
}

/**
 * The canonical Lead conversion. `eventId` MUST be the exact id already
 * accepted by POST /api/leads for this submission, so the browser and
 * server copies of the SAME conversion deduplicate in Meta's Events
 * Manager. Call this ONLY after a successful {success:true} API response —
 * never on form-open, keystroke, or request-start. See README.md
 * "Deduplication".
 */
export function trackLead(eventId: string): void {
  window.fbq?.("track", "Lead", {}, { eventID: eventId });
}
