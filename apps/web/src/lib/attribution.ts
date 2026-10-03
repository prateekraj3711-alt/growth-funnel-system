import type { AttributionData, TrackingData } from "@growth-funnel/shared";

const STORAGE_KEY = "gf_attribution_v1";

function captureNow(): AttributionData {
  const params = new URLSearchParams(window.location.search);
  const pick = (key: string): string | undefined => {
    const value = params.get(key);
    return value && value.trim() ? value.trim() : undefined;
  };

  return {
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmContent: pick("utm_content"),
    utmTerm: pick("utm_term"),
    fbclid: pick("fbclid"),
    landingPage: window.location.href,
    referrer: document.referrer || undefined,
    firstTouchAt: new Date().toISOString(),
  };
}

/**
 * First-touch attribution, captured once per browser session and never
 * overwritten afterwards — a reload mid-funnel, or any later navigation,
 * must not reset who/what brought this visitor here. The actual capture
 * happens synchronously in index.html (before React even mounts) so it
 * survives a failed bundle load; this just reads what was already stored,
 * falling back to a fresh (non-persisted) capture if sessionStorage was
 * unavailable at page load (private browsing, etc.).
 *
 * See README.md "Attribution" for the full rationale.
 */
export function getFirstTouchAttribution(): AttributionData {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing) as AttributionData;
  } catch {
    // sessionStorage inaccessible — fall through to an unpersisted capture
  }

  const captured = captureNow();
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
  } catch {
    // non-fatal: this view just won't persist across a reload
  }
  return captured;
}

function readCookie(name: string): string | undefined {
  const row = document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`));
  return row?.split("=")[1];
}

/**
 * Meta's own browser identifiers, read fresh at submit time (not frozen at
 * first touch) — `_fbp`/`_fbc` are written/refreshed by the Pixel itself and
 * represent this browser's CURRENT Meta identity, which is what Meta's
 * matching actually wants. If the Pixel hasn't set `_fbc` yet but we
 * captured an `fbclid` at first touch, we reconstruct `fbc` in Meta's
 * documented format as a fallback.
 */
export function getCurrentTracking(firstTouch: AttributionData): TrackingData {
  const fbp = readCookie("_fbp");
  let fbc = readCookie("_fbc");

  if (!fbc && firstTouch.fbclid) {
    fbc = `fb.1.${Date.now()}.${firstTouch.fbclid}`;
  }

  return { fbp, fbc };
}
