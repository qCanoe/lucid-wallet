import { z } from "zod";
import { ToolDefinition } from "../types/tool";

export const chainReadInputSchema = z.object({
  address: z.string(),
  token: z.string().optional(),
  spender: z.string().optional(),
  required_amount: z.string().optional(),
  required_allowance: z.string().optional()
});

export const chainReadOutputSchema = z.object({
  balance: z.string(),
  nonce: z.number().optional(),
  allowance: z.string().optional()
});

export const chainReadTool: ToolDefinition<
  z.infer<typeof chainReadInputSchema>,
  z.infer<typeof chainReadOutputSchema>
> = {
  name: "chain_read",
  inputSchema: chainReadInputSchema,
  outputSchema: chainReadOutputSchema,
  cost_estimate: "low",
  requires_signature: false,
  is_retryable: true,
  required_permissions: [],
  handler: async () => ({
    balance: "1000000",
    nonce: 0,
    allowance: "1000000"
  })
};
