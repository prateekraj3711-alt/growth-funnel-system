import { buildApp } from "./app.js";
import { prisma } from "./lib/db.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";

async function main(): Promise<void> {
  const app = await buildApp();

  const port = env.PORT ?? env.API_PORT;
  await app.listen({ port, host: "0.0.0.0" });
  logger.info({ port }, "API listening");

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutting down API gracefully");
    try {
      await app.close();
      await prisma.$disconnect();
      logger.info("API shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  logger.error({ err }, "Fatal error during API startup");
  process.exit(1);
});
