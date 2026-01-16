import { MvpIntent, MvpPlan } from "@lucidwallet/core";

export const buildPlan = (intent: MvpIntent): MvpPlan => {
  return {
    plan_id: `plan_${Date.now()}`,
    steps: [
      {
        step_id: "simulate_transfer",
        tool: "simulate_transfer",
        input: {
          chain: intent.chain,
          asset: intent.asset,
          amount: intent.amount,
          to: intent.to
        }
      }
    ]
  };
};
