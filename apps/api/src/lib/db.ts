import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

// A single shared Prisma client for the whole process (the documented
// pattern — one PrismaClient per process, not per-request).
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
