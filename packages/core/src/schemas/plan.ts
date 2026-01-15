import { z } from "zod";

export const planStepSchema = z.object({
  step_id: z.string(),
  tool: z.string(),
  input: z.record(z.unknown()),
  preconditions: z.array(z.string()).default([]),
  postconditions: z.array(z.string()).default([]),
  retry_policy: z.object({
    max_retries: z.number().default(0),
    backoff_ms: z.number().default(0)
  }).optional()
});

export const planSchema = z.object({
  plan_id: z.string(),
  steps: z.array(planStepSchema),
  constraints: z.object({
    slippage: z.number().optional(),
    max_gas: z.string().optional(),
    max_total_fee: z.string().optional(),
    timeout_ms: z.number().optional()
  }).optional(),
  required_permissions: z.object({
    allowance: z.array(z.object({
      token: z.string(),
      spender: z.string(),
      amount: z.string()
    })).default([]),
    signatures: z.number().default(0)
  }).optional()
});

export type Plan = z.infer<typeof planSchema>;
export type PlanStep = z.infer<typeof planStepSchema>;
