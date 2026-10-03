import type { ApiLeadResponse, CreateLeadRequest } from "@growth-funnel/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function submitLead(
  body: CreateLeadRequest,
  idempotencyKey: string,
): Promise<ApiLeadResponse> {
  const response = await fetch(`${API_URL}/api/leads`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify(body),
    // Lets the request complete even if the browser is navigating away or
    // the tab is being closed right after the user taps submit.
    keepalive: true,
  });

  const data = (await response.json()) as ApiLeadResponse;
  return data;
}
