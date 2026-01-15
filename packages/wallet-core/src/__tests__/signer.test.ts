import { describe, expect, it } from "vitest";
import { consentScopeSchema } from "@lucidwallet/core";
import { Signer } from "..";

describe("Signer consent scope", () => {
  it("rejects chain mismatch", async () => {
    const scope = consentScopeSchema.parse({
      chain: "evm",
      spender_allowlist: [],
      tokens: [],
      max_amount: "1",
      expiry: Date.now() + 60_000,
      risk_level: "low"
    });
    const signer = new Signer(scope);
    await expect(
      signer.sign({ chain: "other", to: "0x1", data: "0x" })
    ).rejects.toThrow("chain_not_allowed");
  });

  it("rejects expired consent", async () => {
    const scope = consentScopeSchema.parse({
      chain: "evm",
      spender_allowlist: [],
      tokens: [],
      max_amount: "1",
      expiry: Date.now() - 1,
      risk_level: "low"
    });
    const signer = new Signer(scope);
    await expect(
      signer.sign({ chain: "evm", to: "0x1", data: "0x" })
    ).rejects.toThrow("consent_expired");
  });

  it("rejects spender/token/amount outside scope", async () => {
    const scope = consentScopeSchema.parse({
      chain: "evm",
      spender_allowlist: ["0xA"],
      tokens: ["USDC"],
      max_amount: "10",
      expiry: Date.now() + 60_000,
      risk_level: "low"
    });
    const signer = new Signer(scope);
    await expect(
      signer.sign({
        chain: "evm",
        to: "0x1",
        data: "0x",
        token: "DAI",
        amount: "100",
        spender: "0xB"
      })
    ).rejects.toThrow();
  });
});
