import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";
import { getProvider, useStubs } from "./config.js";

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
  handler: async (input) => {
    if (useStubs()) {
      return {
        success: true,
        gas_used: "0"
      };
    }

    const provider = getProvider();
    const request = {
      to: input.to,
      data: input.data,
      value: input.value ? BigInt(input.value) : undefined
    };

    try {
      await provider.call(request);
      const gasUsed = await provider.estimateGas(request);
      return {
        success: true,
        gas_used: gasUsed.toString()
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      throw new Error(`simulation_failed:${message}`);
    }
  }
};
