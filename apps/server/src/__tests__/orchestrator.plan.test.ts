import { describe, expect, it } from "vitest";
import { consentScopeSchema } from "@lucidwallet/core";
import { Signer } from "@lucidwallet/wallet-core";
import { Orchestrator } from "../orchestrator";

describe("Orchestrator plan", () => {
  it("generates approve+swap plan with permissions", async () => {
    const scope = consentScopeSchema.parse({
      chain: "evm",
      spender_allowlist: ["0xSWAP_CONTRACT"],
      tokens: ["USDC"],
      max_amount: "200",
      expiry: Date.now() + 60_000,
      risk_level: "low"
    });
    const orchestrator = new Orchestrator(new Signer(scope));
    const { plan } = await orchestrator.execute({
      action_type: "swap",
      chain: "evm",
      asset_in: "USDC",
      asset_out: "ETH",
      amount: "200",
      target_protocol: "approve+swap"
    });

    expect(plan.steps[0].step_id).toBe("chain_read");
    expect(plan.steps.some((s) => s.step_id === "build_approve_tx")).toBe(true);
    expect(plan.required_permissions?.allowance?.length).toBe(1);
    expect(plan.required_permissions?.signatures).toBe(2);
  });
});
