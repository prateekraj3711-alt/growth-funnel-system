import pino from "pino";
import { env } from "./env.js";

// Structured logging. `redact` is a hard backstop — nobody should ever pass
// these keys in, but if they do, pino replaces the value instead of leaking
// it. Business fields (request_id/lead_id/event_id/job_id) are passed as
// bindings so every log line from a given request/job carries them.
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "email",
      "phone",
      "*.email",
      "*.phone",
      "req.headers.authorization",
      "accessToken",
      "apiKey",
      "req.body.lead.email",
      "req.body.lead.phone",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
});

export type Logger = typeof logger;
