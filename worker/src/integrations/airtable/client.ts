import type { Logger } from "pino";

export interface AirtableLeadFields {
  lead_id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  qualification_age_over_40?: boolean;
  receives_benefits?: boolean;
  employed?: boolean;
  condition_limits_work?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  event_id: string;
}

export interface AirtableSyncResult {
  ok: true;
  mocked: boolean;
  recordId?: string;
  action: "created" | "updated" | "mocked";
}

export interface AirtableConfig {
  enabled: boolean;
  apiKey: string;
  baseId: string;
  tableId: string;
  simulateFailure: boolean;
}

interface AirtableRecord {
  id: string;
}

/**
 * Airtable is a downstream *operational* destination, never the system of
 * record. Upserts by `lead_id` (not Airtable's own record id) so a retried
 * sync job updates the existing row instead of creating a duplicate — see
 * SUBMISSION.md "Reliability".
 */
export class AirtableClient {
  constructor(
    private readonly config: AirtableConfig,
    private readonly logger: Logger,
  ) {}

  async upsertLead(fields: AirtableLeadFields): Promise<AirtableSyncResult> {
    if (this.config.simulateFailure) {
      this.logger.warn(
        { leadId: fields.lead_id },
        "AIRTABLE_SIMULATE_FAILURE=true — forcing a simulated failure",
      );
      throw new Error("Simulated Airtable failure (AIRTABLE_SIMULATE_FAILURE=true)");
    }

    if (!this.config.enabled) {
      this.logger.info(
        { leadId: fields.lead_id, mocked: true, fields },
        "Airtable mock mode: constructed real upsert payload, did not send",
      );
      return { ok: true, mocked: true, action: "mocked" };
    }

    const existing = await this.findByLeadId(fields.lead_id);
    if (existing) {
      await this.patchRecord(existing.id, fields);
      this.logger.info({ leadId: fields.lead_id, recordId: existing.id }, "Airtable record updated");
      return { ok: true, mocked: false, recordId: existing.id, action: "updated" };
    }

    const created = await this.createRecord(fields);
    this.logger.info({ leadId: fields.lead_id, recordId: created.id }, "Airtable record created");
    return { ok: true, mocked: false, recordId: created.id, action: "created" };
  }

  private baseUrl(): string {
    return `https://api.airtable.com/v0/${this.config.baseId}/${this.config.tableId}`;
  }

  private authHeaders(): Record<string, string> {
    return {
      authorization: `Bearer ${this.config.apiKey}`,
      "content-type": "application/json",
    };
  }

  private async findByLeadId(leadId: string): Promise<AirtableRecord | null> {
    // lead_id is always server-generated (lead_<uuid>) — never raw user
    // input — but the quote is escaped defensively regardless.
    const safeLeadId = leadId.replace(/"/g, '\\"');
    const formula = encodeURIComponent(`{lead_id} = "${safeLeadId}"`);
    const response = await fetch(`${this.baseUrl()}?filterByFormula=${formula}&maxRecords=1`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Airtable lookup failed with status ${response.status}`);
    }
    const body = (await response.json()) as { records: AirtableRecord[] };
    return body.records[0] ?? null;
  }

  private async createRecord(fields: AirtableLeadFields): Promise<AirtableRecord> {
    const response = await fetch(this.baseUrl(), {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ fields, typecast: true }),
    });
    if (!response.ok) {
      throw new Error(`Airtable create failed with status ${response.status}`);
    }
    return (await response.json()) as AirtableRecord;
  }

  private async patchRecord(recordId: string, fields: AirtableLeadFields): Promise<void> {
    const response = await fetch(`${this.baseUrl()}/${recordId}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify({ fields, typecast: true }),
    });
    if (!response.ok) {
      throw new Error(`Airtable update failed with status ${response.status}`);
    }
  }
}
