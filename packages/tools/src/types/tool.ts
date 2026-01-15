import { z } from "zod";

export type ToolContext = {
  chain: string;
  request_id: string;
  signer?: {
    sign: (request: {
      chain: string;
      to: string;
      data: string;
      value?: string;
    }) => Promise<{ signed_tx: string }>;
  };
};

export type ToolDefinition<TInput, TOutput> = {
  name: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  cost_estimate: "low" | "medium" | "high";
  requires_signature: boolean;
  is_retryable: boolean;
  required_permissions: string[];
  handler: (input: TInput, context: ToolContext) => Promise<TOutput>;
};
