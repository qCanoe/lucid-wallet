import { z } from "zod";

export const stepResultSchema = z.object({
  step_id: z.string(),
  status: z.enum(["success", "failed", "skipped"]),
  simulation: z.record(z.unknown()).optional(),
  tx_hash: z.string().optional(),
  receipt: z.record(z.unknown()).optional(),
  asset_changes: z.array(z.object({
    asset: z.string(),
    delta: z.string()
  })).optional(),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).optional()
});

export type StepResult = z.infer<typeof stepResultSchema>;
