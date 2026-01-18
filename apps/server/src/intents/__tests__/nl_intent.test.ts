import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseNaturalLanguageIntent } from "../nl/parse_nl_intent.js";

const templateFile = path.join(
  process.cwd(),
  "datasets",
  "nl-templates",
  "send_swap.json"
);

describe("parseNaturalLanguageIntent", () => {
  const address = "0x1111111111111111111111111111111111111111";

  it("parses English send intent", async () => {
    const intent = await parseNaturalLanguageIntent(`send 0.1 ETH to ${address}`, {
      templateFile
    });
    expect(intent).toEqual({
      action_type: "send",
      chain: "evm",
      asset_in: "ETH",
      amount: "0.1",
      recipient: address
    });
  });

  it("parses Chinese send intent", async () => {
    const intent = await parseNaturalLanguageIntent(`把0.2 USDC转给${address}`, {
      templateFile
    });
    expect(intent).toEqual({
      action_type: "send",
      chain: "evm",
      asset_in: "USDC",
      amount: "0.2",
      recipient: address
    });
  });

  it("parses English swap intent with slippage", async () => {
    const intent = await parseNaturalLanguageIntent("swap 200 usdc to eth with slippage 0.5%", {
      templateFile
    });
    expect(intent).toEqual({
      action_type: "swap",
      chain: "evm",
      asset_in: "USDC",
      asset_out: "ETH",
      amount: "200",
      constraints: { slippage: 0.5 }
    });
  });

  it("parses Chinese swap intent with slippage", async () => {
    const intent = await parseNaturalLanguageIntent("用200 USDC换ETH滑点0.5%", {
      templateFile
    });
    expect(intent).toEqual({
      action_type: "swap",
      chain: "evm",
      asset_in: "USDC",
      asset_out: "ETH",
      amount: "200",
      constraints: { slippage: 0.5 }
    });
  });

  it("parses English send intent with chain", async () => {
    const intent = await parseNaturalLanguageIntent(
      `transfer 1.25 usdc to ${address} on sepolia`,
      { templateFile }
    );
    expect(intent).toEqual({
      action_type: "send",
      chain: "sepolia",
      asset_in: "USDC",
      amount: "1.25",
      recipient: address
    });
  });

  it("parses Chinese send intent with spacing", async () => {
    const intent = await parseNaturalLanguageIntent(
      `把 0.05 eth 转给 ${address}`,
      { templateFile }
    );
    expect(intent).toEqual({
      action_type: "send",
      chain: "evm",
      asset_in: "ETH",
      amount: "0.05",
      recipient: address
    });
  });

  it("parses English swap intent with chain and spacing", async () => {
    const intent = await parseNaturalLanguageIntent(
      "swap 50 dai to usdc on arbitrum",
      { templateFile }
    );
    expect(intent).toEqual({
      action_type: "swap",
      chain: "arbitrum",
      asset_in: "DAI",
      asset_out: "USDC",
      amount: "50"
    });
  });

  it("throws when no template matches", async () => {
    await expect(
      parseNaturalLanguageIntent("please do something", { templateFile })
    ).rejects.toThrow("template_not_matched");
  });
});
