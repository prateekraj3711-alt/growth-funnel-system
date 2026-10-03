import { z } from "zod";

const boolFromString = z
  .string()
  .optional()
  .transform((value) => value?.trim().toLowerCase() === "true");

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),

  META_ENABLED: boolFromString,
  META_PIXEL_ID: z.string().optional().default(""),
  META_ACCESS_TOKEN: z.string().optional().default(""),
  META_TEST_EVENT_CODE: z.string().optional().default(""),
  META_SIMULATE_FAILURE: boolFromString,

  AIRTABLE_ENABLED: boolFromString,
  AIRTABLE_API_KEY: z.string().optional().default(""),
  AIRTABLE_BASE_ID: z.string().optional().default(""),
  AIRTABLE_TABLE_ID: z.string().optional().default(""),
  AIRTABLE_SIMULATE_FAILURE: boolFromString,

  MAX_JOB_ATTEMPTS: z.coerce.number().int().positive().default(5),
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  JOB_LEASE_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),

  PRIVACY_POLICY_VERSION: z.string().default("1.0.0"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  if (parsed.data.NODE_ENV === "production") {
    if (parsed.data.META_SIMULATE_FAILURE || parsed.data.AIRTABLE_SIMULATE_FAILURE) {
      console.error(
        "Refusing to start: *_SIMULATE_FAILURE must never be enabled when NODE_ENV=production.",
      );
      process.exit(1);
    }
  }

  return parsed.data;
}

export const env = loadEnv();
