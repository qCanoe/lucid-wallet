import { z } from "zod";
import { ToolDefinition } from "../types/tool";

export const sendTxInputSchema = z.object({
  signed_tx: z.string()
});

export const sendTxOutputSchema = z.object({
  tx_hash: z.string()
});

export const sendTxTool: ToolDefinition<
  z.infer<typeof sendTxInputSchema>,
  z.infer<typeof sendTxOutputSchema>
> = {
  name: "send_tx",
  inputSchema: sendTxInputSchema,
  outputSchema: sendTxOutputSchema,
  cost_estimate: "low",
  requires_signature: false,
  is_retryable: true,
  required_permissions: [],
  handler: async (input) => {
    const base = input.signed_tx.replace(/^0x/, "");
    const prefix = base.slice(0, 12).padEnd(12, "0");
    return {
      tx_hash: `0xhash_${prefix}`
    };
  }
};
