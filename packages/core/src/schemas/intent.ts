import { z } from "zod";

export const intentSpecSchema = z.object({
  action_type: z.enum([
    "send",
    "swap",
    "approve",
    "revoke",
    "deposit",
    "stake",
    "withdraw",
    "unstake",
    "batch",
    "rebalance",
    "schedule"
  ]),
  chain: z.string(),
  asset_in: z.string().optional(),
  asset_out: z.string().optional(),
  amount: z.string(),
  constraints: z.object({
    slippage: z.number().optional(),
    deadline: z.number().optional()
  }).optional(),
  target_protocol: z.string().optional(),
  recipient: z.string().optional()
});

export type IntentSpec = z.infer<typeof intentSpecSchema>;
