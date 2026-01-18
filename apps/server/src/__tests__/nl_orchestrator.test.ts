import path from "node:path";
import { describe, expect, it } from "vitest";
import { consentScopeSchema } from "@lucidwallet/core";
import { Signer } from "@lucidwallet/wallet-core";
import { Orchestrator } from "../orchestrator.js";
import { parseNaturalLanguageIntent } from "../intents/nl/parse_nl_intent.js";

const templateFile = path.join(
  process.cwd(),
  "datasets",
  "nl-templates",
  "send_swap.json"
);

describe("NL -> Orchestrator (stub)", () => {
  it("executes swap intent end-to-end with stubs", async () => {
    const previousStub = process.env.LUCIDWALLET_USE_STUBS;
    const previousKey = process.env.LUCIDWALLET_OPENAI_API_KEY;
    process.env.LUCIDWALLET_USE_STUBS = "true";
    delete process.env.LUCIDWALLET_OPENAI_API_KEY;

    try {
      const intent = await parseNaturalLanguageIntent(
        "swap 200 usdc to eth with slippage 0.5%",
        { templateFile }
      );
      const scope = consentScopeSchema.parse({
        chain: intent.chain,
        spender_allowlist: ["0xSWAP_CONTRACT"],
        tokens: [intent.asset_in ?? "USDC"],
        max_amount: intent.amount,
        expiry: Date.now() + 60_000,
        risk_level: "low"
      });
      const signer = new Signer(scope);
      const orchestrator = new Orchestrator(signer);
      const { plan, results } = await orchestrator.execute(intent);

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(results.length).toBe(plan.steps.length);
      expect(results.every((result) => result.status === "success")).toBe(true);
    } finally {
      if (previousStub === undefined) {
        delete process.env.LUCIDWALLET_USE_STUBS;
      } else {
        process.env.LUCIDWALLET_USE_STUBS = previousStub;
      }
      if (previousKey === undefined) {
        delete process.env.LUCIDWALLET_OPENAI_API_KEY;
      } else {
        process.env.LUCIDWALLET_OPENAI_API_KEY = previousKey;
      }
    }
  });
});
