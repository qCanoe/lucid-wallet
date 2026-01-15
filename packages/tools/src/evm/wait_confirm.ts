import { z } from "zod";
import { ToolDefinition } from "../types/tool";

export const waitConfirmInputSchema = z.object({
  tx_hash: z.string()
});

export const waitConfirmOutputSchema = z.object({
  status: z.enum(["confirmed", "failed"]),
  receipt: z.record(z.unknown()).optional()
});

export const waitConfirmTool: ToolDefinition<
  z.infer<typeof waitConfirmInputSchema>,
  z.infer<typeof waitConfirmOutputSchema>
> = {
  name: "wait_confirm",
  inputSchema: waitConfirmInputSchema,
  outputSchema: waitConfirmOutputSchema,
  cost_estimate: "low",
  requires_signature: false,
  is_retryable: true,
  required_permissions: [],
  handler: async (input) => ({
    status: "confirmed",
    receipt: { tx_hash: input.tx_hash }
  })
};
