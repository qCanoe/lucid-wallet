import { IntentSpec } from "@lucidwallet/core";
import { consentScopeSchema } from "@lucidwallet/core";
import { Signer } from "@lucidwallet/wallet-core";
import { Orchestrator } from "./orchestrator.js";

export async function runDemo(): Promise<void> {
  const scope = consentScopeSchema.parse({
    chain: "evm",
    spender_allowlist: ["0xSWAP_CONTRACT"],
    tokens: ["USDC"],
    max_amount: "200",
    expiry: Date.now() + 60_000,
    risk_level: "low"
  });

  const signer = new Signer(scope);
  const orchestrator = new Orchestrator(signer);

  const intent: IntentSpec = {
    action_type: "swap",
    chain: "evm",
    asset_in: "USDC",
    asset_out: "ETH",
    amount: "200",
    target_protocol: "approve+swap",
    constraints: { slippage: 0.5 }
  };

  const { plan, results } = await orchestrator.execute(intent);
  console.log(plan.plan_id, results.map((r) => r.status));
}
