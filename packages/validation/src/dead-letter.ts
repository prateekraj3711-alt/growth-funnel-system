import { z } from "zod";

export const requeueJobParamsSchema = z.object({
  jobId: z.string().trim().min(1),
});
