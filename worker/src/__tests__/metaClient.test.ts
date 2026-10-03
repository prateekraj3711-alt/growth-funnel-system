import pino from "pino";
import { describe, expect, it } from "vitest";
import { MetaCapiClient } from "../integrations/meta/client.js";
import { hashEmail, hashName, hashPhoneE164 } from "../integrations/meta/normalize.js";

const silentLogger = pino({ level: "silent" });

const baseConfig = {
  enabled: false,
  pixelId: "test-pixel",
  accessToken: "test-token",
  simulateFailure: false,
};

describe("MetaCapiClient.buildPayload", () => {
  it("hashes em/ph/fn/ln and leaves ip/ua/fbp/fbc raw", () => {
    const client = new MetaCapiClient(baseConfig, silentLogger);
    const payload = client.buildPayload({
      eventId: "11111111-1111-1111-1111-111111111111",
      eventTime: 1700000000,
      eventSourceUrl: "https://example.com/funnel",
      userData: {
        email: "Jane.Doe@Example.com",
        phone: "+15551234567",
        firstName: "Jane",
        lastName: "Doe",
        clientIp: "203.0.113.5",
        userAgent: "test-agent/1.0",
        fbp: "fb.1.1700000000.111",
        fbc: "fb.1.1700000000.222",
      },
    }) as { data: Array<Record<string, unknown>> };

    const event = payload.data[0];
    expect(event?.event_name).toBe("Lead");
    expect(event?.event_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(event?.event_time).toBe(1700000000);
    expect(event?.action_source).toBe("website");
    expect(event?.event_source_url).toBe("https://example.com/funnel");
    expect(event?.custom_data).toBeUndefined(); // never sent — see README privacy section

    const userData = event?.user_data as Record<string, unknown>;
    expect(userData.em).toEqual([hashEmail("Jane.Doe@Example.com")]);
    expect(userData.ph).toEqual([hashPhoneE164("+15551234567")]);
    expect(userData.fn).toEqual([hashName("Jane")]);
    expect(userData.ln).toEqual([hashName("Doe")]);
    // Raw, never hashed:
    expect(userData.client_ip_address).toBe("203.0.113.5");
    expect(userData.client_user_agent).toBe("test-agent/1.0");
    expect(userData.fbp).toBe("fb.1.1700000000.111");
    expect(userData.fbc).toBe("fb.1.1700000000.222");
  });

  it("omits optional matching fields when not provided", () => {
    const client = new MetaCapiClient(baseConfig, silentLogger);
    const payload = client.buildPayload({
      eventId: "id",
      eventTime: 1700000000,
      userData: { email: "a@b.com", phone: "+15551234567", firstName: "A", lastName: "B" },
    }) as { data: Array<Record<string, unknown>> };

    const userData = payload.data[0]?.user_data as Record<string, unknown>;
    expect(userData.client_ip_address).toBeUndefined();
    expect(userData.fbp).toBeUndefined();
    expect(payload.data[0]?.event_source_url).toBeUndefined();
  });

  it("includes test_event_code only when configured", () => {
    const withCode = new MetaCapiClient({ ...baseConfig, testEventCode: "TEST123" }, silentLogger);
    const payload = withCode.buildPayload({
      eventId: "id",
      eventTime: 1700000000,
      userData: { email: "a@b.com", phone: "+15551234567", firstName: "A", lastName: "B" },
    }) as Record<string, unknown>;
    expect(payload.test_event_code).toBe("TEST123");

    const withoutCode = new MetaCapiClient(baseConfig, silentLogger);
    const payloadNoCode = withoutCode.buildPayload({
      eventId: "id",
      eventTime: 1700000000,
      userData: { email: "a@b.com", phone: "+15551234567", firstName: "A", lastName: "B" },
    }) as Record<string, unknown>;
    expect(payloadNoCode.test_event_code).toBeUndefined();
  });
});

describe("MetaCapiClient.sendLeadEvent", () => {
  const input = {
    eventId: "id",
    eventTime: 1700000000,
    userData: { email: "a@b.com", phone: "+15551234567", firstName: "A", lastName: "B" },
  };

  it("returns a mocked success without any network call when disabled", async () => {
    const client = new MetaCapiClient(baseConfig, silentLogger);
    const result = await client.sendLeadEvent(input);
    expect(result).toEqual({ ok: true, mocked: true });
  });

  it("throws when META_SIMULATE_FAILURE is set, even in mock mode", async () => {
    const client = new MetaCapiClient({ ...baseConfig, simulateFailure: true }, silentLogger);
    await expect(client.sendLeadEvent(input)).rejects.toThrow(/Simulated Meta CAPI failure/);
  });
});
