import { z } from "zod";
import { ToolDefinition } from "../types/tool";

export const simulateTxInputSchema = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string().optional()
});

export const simulateTxOutputSchema = z.object({
  success: z.boolean(),
  gas_used: z.string().optional(),
  error: z.string().optional()
});

export const simulateTxTool: ToolDefinition<
  z.infer<typeof simulateTxInputSchema>,
  z.infer<typeof simulateTxOutputSchema>
> = {
  name: "simulate_tx",
  inputSchema: simulateTxInputSchema,
  outputSchema: simulateTxOutputSchema,
  cost_estimate: "medium",
  requires_signature: false,
  is_retryable: true,
  required_permissions: [],
  handler: async () => ({
    success: true,
    gas_used: "0"
  })
};
