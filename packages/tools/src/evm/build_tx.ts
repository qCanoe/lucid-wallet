import { z } from "zod";
import { ToolDefinition } from "../types/tool";

export const buildTxInputSchema = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string().optional()
});

export const buildTxOutputSchema = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string().optional(),
  gas_limit: z.string().optional()
});

export const buildTxTool: ToolDefinition<
  z.infer<typeof buildTxInputSchema>,
  z.infer<typeof buildTxOutputSchema>
> = {
  name: "build_tx",
  inputSchema: buildTxInputSchema,
  outputSchema: buildTxOutputSchema,
  cost_estimate: "medium",
  requires_signature: false,
  is_retryable: true,
  required_permissions: [],
  handler: async (input) => ({
    ...input,
    gas_limit: "21000"
  })
};
