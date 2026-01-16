import { z } from "zod";

export const mvpPlanStepSchema = z.object({
  step_id: z.string(),
  tool: z.string(),
  input: z.record(z.unknown())
});

export const mvpPlanSchema = z.object({
  plan_id: z.string(),
  steps: z.array(mvpPlanStepSchema)
});

export type MvpPlan = z.infer<typeof mvpPlanSchema>;
export type MvpPlanStep = z.infer<typeof mvpPlanStepSchema>;
