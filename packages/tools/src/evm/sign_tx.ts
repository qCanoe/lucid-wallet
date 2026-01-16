import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

export const signTxInputSchema = z.object({
  chain: z.string(),
  to: z.string(),
  data: z.string(),
  value: z.string().optional()
});

export const signTxOutputSchema = z.object({
  signed_tx: z.string()
});

export const signTxTool: ToolDefinition<
  z.infer<typeof signTxInputSchema>,
  z.infer<typeof signTxOutputSchema>
> = {
  name: "sign_tx",
  inputSchema: signTxInputSchema,
  outputSchema: signTxOutputSchema,
  cost_estimate: "low",
  requires_signature: true,
  is_retryable: false,
  required_permissions: ["sign"],
  handler: async (input, context) => {
    if (!context.signer) {
      throw new Error("signer_not_available");
    }
    return context.signer.sign(input);
  }
};
