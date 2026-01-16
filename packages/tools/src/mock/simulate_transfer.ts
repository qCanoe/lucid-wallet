import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";

export const simulateTransferInputSchema = z.object({
  chain: z.string(),
  asset: z.string(),
  amount: z.string(),
  to: z.string()
});

export const simulateTransferOutputSchema = z.object({
  tx_hash: z.string(),
  summary: z.string(),
  fee_estimate: z.string()
});

const makeTxHash = (): string => {
  const stamp = Date.now().toString(16);
  const rand = Math.floor(Math.random() * 1_000_000_000).toString(16);
  return `0x${stamp}${rand}`.padEnd(66, "0").slice(0, 66);
};

export const simulateTransferTool: ToolDefinition<
  z.infer<typeof simulateTransferInputSchema>,
  z.infer<typeof simulateTransferOutputSchema>
> = {
  name: "simulate_transfer",
  inputSchema: simulateTransferInputSchema,
  outputSchema: simulateTransferOutputSchema,
  cost_estimate: "low",
  requires_signature: false,
  is_retryable: true,
  required_permissions: [],
  handler: async (input) => {
    const amount = input.amount.trim();
    if (!amount || amount === "0") {
      throw new Error("invalid_amount");
    }

    return {
      tx_hash: makeTxHash(),
      summary: `Simulated send ${input.amount} ${input.asset} to ${input.to} on ${input.chain}.`,
      fee_estimate: "21000"
    };
  }
};
