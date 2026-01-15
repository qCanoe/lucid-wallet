import { z } from "zod";

export const consentScopeSchema = z.object({
  chain: z.string(),
  spender_allowlist: z.array(z.string()).default([]),
  tokens: z.array(z.string()).default([]),
  max_amount: z.string(),
  expiry: z.number(),
  risk_level: z.enum(["low", "medium", "high"]).default("low")
});

export type ConsentScope = z.infer<typeof consentScopeSchema>;
