import type { Logger } from "pino";
import { hashEmail, hashName, hashPhoneE164 } from "./normalize.js";

export interface MetaUserData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}

export interface MetaLeadEventInput {
  eventId: string;
  /** Unix seconds. */
  eventTime: number;
  eventSourceUrl?: string;
  userData: MetaUserData;
}

export interface MetaSendResult {
  ok: true;
  mocked: boolean;
  status?: number;
}

export interface MetaCapiConfig {
  enabled: boolean;
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
  simulateFailure: boolean;
}

const GRAPH_API_VERSION = "v21.0";

/**
 * Server-side Meta Conversions API client.
 *
 * Deliberately NEVER includes qualification answers in custom_data — see
 * SUBMISSION.md "Privacy / Data Handling". Scope is strictly: browser
 * Pixel + CAPI + event_id + dedup + matching, per the assignment's "Meta
 * scope" boundary.
 */
export class MetaCapiClient {
  constructor(
    private readonly config: MetaCapiConfig,
    private readonly logger: Logger,
  ) {}

  async sendLeadEvent(input: MetaLeadEventInput): Promise<MetaSendResult> {
    const payload = this.buildPayload(input);

    if (this.config.simulateFailure) {
      this.logger.warn(
        { eventId: input.eventId },
        "META_SIMULATE_FAILURE=true — forcing a simulated failure",
      );
      throw new Error("Simulated Meta CAPI failure (META_SIMULATE_FAILURE=true)");
    }

    if (!this.config.enabled) {
      this.logger.info(
        { eventId: input.eventId, eventName: "Lead", mocked: true, payload },
        "Meta CAPI mock mode: constructed real payload, did not send",
      );
      return { ok: true, mocked: true };
    }

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.config.pixelId}/events?access_token=${encodeURIComponent(this.config.accessToken)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      this.logger.error(
        { eventId: input.eventId, status: response.status, errorBody },
        "Meta CAPI request failed",
      );
      throw new Error(`Meta CAPI request failed with status ${response.status}`);
    }

    this.logger.info({ eventId: input.eventId, status: response.status }, "Meta CAPI event sent");
    return { ok: true, mocked: false, status: response.status };
  }

  /** Exposed for testing — payload construction is the part most likely to
   * silently drift from Meta's spec, so it's verified independently of
   * network behaviour. */
  buildPayload(input: MetaLeadEventInput): Record<string, unknown> {
    const { userData } = input;

    const userDataPayload: Record<string, unknown> = {
      em: [hashEmail(userData.email)],
      ph: [hashPhoneE164(userData.phone)],
      fn: [hashName(userData.firstName)],
      ln: [hashName(userData.lastName)],
    };
    if (userData.clientIp) userDataPayload.client_ip_address = userData.clientIp;
    if (userData.userAgent) userDataPayload.client_user_agent = userData.userAgent;
    if (userData.fbp) userDataPayload.fbp = userData.fbp;
    if (userData.fbc) userDataPayload.fbc = userData.fbc;

    const event: Record<string, unknown> = {
      event_name: "Lead",
      event_time: input.eventTime,
      event_id: input.eventId,
      action_source: "website",
      user_data: userDataPayload,
      // Deliberately no custom_data: qualification answers are sensitive
      // and not necessary for conversion measurement. See SUBMISSION.md.
    };
    if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;

    const body: Record<string, unknown> = { data: [event] };
    if (this.config.testEventCode) body.test_event_code = this.config.testEventCode;
    return body;
  }
}
