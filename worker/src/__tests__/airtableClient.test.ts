import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AirtableClient, type AirtableLeadFields } from "../integrations/airtable/client.js";

const silentLogger = pino({ level: "silent" });

const baseConfig = {
  enabled: true,
  apiKey: "test-key",
  baseId: "appTEST",
  tableId: "tblTEST",
  simulateFailure: false,
};

const fields: AirtableLeadFields = {
  lead_id: "lead_abc123",
  created_at: "2026-01-01T00:00:00.000Z",
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
  phone: "+15551234567",
  event_id: "event_abc123",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AirtableClient.upsertLead", () => {
  it("returns a mocked result without any network call when disabled", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const client = new AirtableClient({ ...baseConfig, enabled: false }, silentLogger);
    const result = await client.upsertLead(fields);

    expect(result).toEqual({ ok: true, mocked: true, action: "mocked" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("creates a new record when no existing record is found for lead_id", async () => {
    const fetchSpy = vi
      .fn()
      // lookup: no existing record
      .mockResolvedValueOnce({ ok: true, json: async () => ({ records: [] }) })
      // create
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "recNEW" }) });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new AirtableClient(baseConfig, silentLogger);
    const result = await client.upsertLead(fields);

    expect(result).toEqual({ ok: true, mocked: false, recordId: "recNEW", action: "created" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const createCall = fetchSpy.mock.calls[1];
    expect(createCall?.[1]?.method).toBe("POST");
  });

  it("updates the existing record instead of creating a duplicate when lead_id already exists", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ records: [{ id: "recEXISTING" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "recEXISTING" }) });
    vi.stubGlobal("fetch", fetchSpy);

    const client = new AirtableClient(baseConfig, silentLogger);
    const result = await client.upsertLead(fields);

    expect(result).toEqual({ ok: true, mocked: false, recordId: "recEXISTING", action: "updated" });
    const updateCall = fetchSpy.mock.calls[1];
    expect(updateCall?.[1]?.method).toBe("PATCH");
    expect(String(updateCall?.[0])).toContain("recEXISTING");
  });

  it("throws when AIRTABLE_SIMULATE_FAILURE is set, without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const client = new AirtableClient({ ...baseConfig, simulateFailure: true }, silentLogger);
    await expect(client.upsertLead(fields)).rejects.toThrow(/Simulated Airtable failure/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("propagates a lookup failure as an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const client = new AirtableClient(baseConfig, silentLogger);
    await expect(client.upsertLead(fields)).rejects.toThrow(/Airtable lookup failed/);
  });
});
