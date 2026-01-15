import { describe, expect, it } from "vitest";
import { consentScopeSchema } from "@lucidwallet/core";
import { Signer } from "@lucidwallet/wallet-core";
import { Orchestrator } from "../orchestrator";
import { ERROR_CODES } from "@lucidwallet/shared";

describe("Orchestrator flow", () => {
  it("threads tx hash into confirmation", async () => {
    const scope = consentScopeSchema.parse({
      chain: "evm",
      spender_allowlist: ["0xSWAP_CONTRACT"],
      tokens: ["USDC"],
      max_amount: "200",
      expiry: Date.now() + 60_000,
      risk_level: "low"
    });
    const orchestrator = new Orchestrator(new Signer(scope));
    const { results } = await orchestrator.execute({
      action_type: "swap",
      chain: "evm",
      asset_in: "USDC",
      asset_out: "ETH",
      amount: "200",
      target_protocol: "approve+swap"
    });

    const sendStep = results.find((r) => r.step_id === "send_swap_tx");
    const confirmStep = results.find((r) => r.step_id === "wait_confirm_swap");
    expect(sendStep?.tx_hash).toBeTruthy();
    expect(confirmStep?.receipt?.tx_hash).toBe(sendStep?.tx_hash);
  });

  it("maps insufficient balance errors", async () => {
    const scope = consentScopeSchema.parse({
      chain: "evm",
      spender_allowlist: ["0xSWAP_CONTRACT"],
      tokens: ["USDC"],
      max_amount: "1000000000",
      expiry: Date.now() + 60_000,
      risk_level: "low"
    });
    const orchestrator = new Orchestrator(new Signer(scope));
    const { results } = await orchestrator.execute({
      action_type: "swap",
      chain: "evm",
      asset_in: "USDC",
      asset_out: "ETH",
      amount: "999999999999999999999999999999",
      target_protocol: "approve+swap"
    });

    const failed = results.find((r) => r.status === "failed");
    expect(failed?.error?.code).toBe(ERROR_CODES.INSUFFICIENT_BALANCE);
  });
});
