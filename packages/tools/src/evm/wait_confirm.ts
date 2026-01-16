import { z } from "zod";
import { ToolDefinition } from "../types/tool";
import { getProvider, useStubs } from "./config";

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
  handler: async (input) => {
    if (useStubs()) {
      return {
        status: "confirmed",
        receipt: { tx_hash: input.tx_hash }
      };
    }

    const provider = getProvider();
    const confirmationsRaw = process.env.LUCIDWALLET_EVM_CONFIRMATIONS;
    const timeoutRaw = process.env.LUCIDWALLET_EVM_RECEIPT_TIMEOUT_MS;
    const confirmations = confirmationsRaw
      ? Number.parseInt(confirmationsRaw, 10)
      : 1;
    const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : 120_000;

    const receipt = await provider.waitForTransaction(
      input.tx_hash,
      Number.isFinite(confirmations) ? confirmations : 1,
      Number.isFinite(timeoutMs) ? timeoutMs : 120_000
    );

    if (!receipt) {
      return {
        status: "failed"
      };
    }

    return {
      status: receipt.status === 1 ? "confirmed" : "failed",
      receipt: receipt as Record<string, unknown>
    };
  }
};
