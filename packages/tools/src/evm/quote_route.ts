import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";
import { getDexConfig, resolveTokenAddress, useStubs } from "./config.js";

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
  handler: async (input) => {
    if (useStubs()) {
      return {
        amount_out: input.amount_in,
        route: ["stub"]
      };
    }

    const { baseUrl, apiKey, chainId } = getDexConfig();
    const url = new URL(`${baseUrl}/${chainId}/quote`);
    url.searchParams.set("src", resolveTokenAddress(input.asset_in));
    url.searchParams.set("dst", resolveTokenAddress(input.asset_out));
    url.searchParams.set("amount", input.amount_in);
    if (input.slippage !== undefined) {
      url.searchParams.set("slippage", input.slippage.toString());
    }

    const response = await fetch(url, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`dex_quote_failed:${response.status}:${payload}`);
    }

    const data = (await response.json()) as {
      toTokenAmount?: string;
      amountOut?: string;
      protocols?: Array<Array<Array<{ name?: string }>>>;
    };

    const amountOut = data.toTokenAmount ?? data.amountOut;
    if (!amountOut) {
      throw new Error("dex_quote_missing_amount");
    }

    const protocols = (data.protocols ?? [])
      .flatMap((group) => group.flatMap((hops) => hops))
      .map((hop) => hop.name)
      .filter((name): name is string => Boolean(name));

    const route = protocols.length > 0 ? Array.from(new Set(protocols)) : ["dex"];

    return {
      amount_out: amountOut,
      route
    };
  }
};
