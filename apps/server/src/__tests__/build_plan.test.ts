import type { MvpIntent } from "@lucidwallet/core";
import { describe, expect, it } from "vitest";
import { buildPlan } from "../plans/build_plan.js";

describe("buildPlan", () => {
  it("produces a single simulate_transfer step with intent fields wired", () => {
    const intent: MvpIntent = {
      action: "send",
      chain: "sepolia",
      asset: "ETH",
      amount: "0.1",
      to: "0x1111111111111111111111111111111111111111"
    };
    const plan = buildPlan(intent);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].tool).toBe("simulate_transfer");
    expect(plan.steps[0].step_id).toBe("simulate_transfer");
    expect(plan.steps[0].input).toMatchObject({
      chain: "sepolia",
      asset: "ETH",
      amount: "0.1",
      to: intent.to
    });
  });
});
