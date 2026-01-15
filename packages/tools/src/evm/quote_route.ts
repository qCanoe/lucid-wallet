import { z } from "zod";
import { ToolDefinition } from "../types/tool";

export const quoteRouteInputSchema = z.object({
  asset_in: z.string(),
  asset_out: z.string(),
  amount_in: z.string(),
  slippage: z.number().optional()
});

export const quoteRouteOutputSchema = z.object({
  amount_out: z.string(),
  route: z.array(z.string())
});

export const quoteRouteTool: ToolDefinition<
  z.infer<typeof quoteRouteInputSchema>,
  z.infer<typeof quoteRouteOutputSchema>
> = {
  name: "quote_route",
  inputSchema: quoteRouteInputSchema,
  outputSchema: quoteRouteOutputSchema,
  cost_estimate: "medium",
  requires_signature: false,
  is_retryable: true,
  required_permissions: [],
  handler: async (input) => ({
    amount_out: input.amount_in,
    route: ["stub"]
  })
};
