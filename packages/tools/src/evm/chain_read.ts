import { z } from "zod";
import { ToolDefinition } from "../types/tool.js";
import { getErc20Interface, getProvider, resolveTokenAddress, useStubs } from "./config.js";
import { getAddress } from "ethers";

export const chainReadInputSchema = z.object({
  address: z.string(),
  token: z.string().optional(),
  spender: z.string().optional(),
  required_amount: z.string().optional(),
  required_allowance: z.string().optional()
});

export const chainReadOutputSchema = z.object({
  balance: z.string(),
  nonce: z.number().optional(),
  allowance: z.string().optional()
});

export const chainReadTool: ToolDefinition<
  z.infer<typeof chainReadInputSchema>,
  z.infer<typeof chainReadOutputSchema>
> = {
  name: "chain_read",
  inputSchema: chainReadInputSchema,
  outputSchema: chainReadOutputSchema,
  cost_estimate: "low",
  requires_signature: false,
  is_retryable: true,
  required_permissions: [],
  handler: async (input) => {
    if (useStubs()) {
      return {
        balance: "1000000",
        nonce: 0,
        allowance: "1000000"
      };
    }

    const provider = getProvider();
    const owner = getAddress(input.address);

    if (input.token) {
      const tokenAddress = resolveTokenAddress(input.token);
      const erc20 = getErc20Interface();
      const balanceData = await provider.call({
        to: tokenAddress,
        data: erc20.encodeFunctionData("balanceOf", [owner])
      });
      const [balance] = erc20.decodeFunctionResult("balanceOf", balanceData);

      let allowance: string | undefined;
      if (input.spender) {
        const spender = getAddress(input.spender);
        const allowanceData = await provider.call({
          to: tokenAddress,
          data: erc20.encodeFunctionData("allowance", [owner, spender])
        });
        const [value] = erc20.decodeFunctionResult("allowance", allowanceData);
        allowance = value.toString();
      }

      return {
        balance: balance.toString(),
        nonce: await provider.getTransactionCount(owner),
        allowance
      };
    }

    const balance = await provider.getBalance(owner);
    return {
      balance: balance.toString(),
      nonce: await provider.getTransactionCount(owner)
    };
  }
};
