// Render's free plan only covers Web Services (not Background Workers —
// see https://render.com/docs/free). To keep the public demo at zero cost,
// this glue script runs the API and the worker as two independent modules
// inside ONE Render Web Service process, purely for that free-tier
// constraint.
//
// This changes nothing about the architecture itself: apps/api and worker
// remain fully separate packages with their own entrypoints, their own
// Prisma client instances, and their own graceful-shutdown handling — this
// file just imports both of those existing entrypoints (each already runs
// itself on import) so Render only has to bill for one service. Local
// development and a paid deployment both still run them as genuinely
// separate processes (`npm run dev:api` / `npm run dev:worker`, or two
// Render services via render.yaml with the worker on a paid plan).
import "../apps/api/dist/server.js";
import "../worker/dist/worker.js";
