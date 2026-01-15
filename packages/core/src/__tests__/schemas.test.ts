import {
  consentScopeSchema,
  intentSpecSchema,
  planSchema,
  stepResultSchema
} from "..";
import { describe, expect, it } from "vitest";

describe("schemas", () => {
  it("rejects invalid intent", () => {
    expect(() =>
      intentSpecSchema.parse({
        action_type: "swap",
        chain: "evm"
      })
    ).toThrow();
  });

  it("accepts valid plan and step result", () => {
    const plan = planSchema.parse({
      plan_id: "plan_1",
      steps: [
        {
          step_id: "step_1",
          tool: "chain_read",
          input: {},
          preconditions: [],
          postconditions: []
        }
      ]
    });
    const result = stepResultSchema.parse({
      step_id: "step_1",
      status: "success"
    });
    expect(plan.plan_id).toBe("plan_1");
    expect(result.status).toBe("success");
  });

  it("accepts consent scope", () => {
    const scope = consentScopeSchema.parse({
      chain: "evm",
      spender_allowlist: ["0xSWAP_CONTRACT"],
      tokens: ["USDC"],
      max_amount: "200",
      expiry: Date.now() + 60_000,
      risk_level: "low"
    });
    expect(scope.chain).toBe("evm");
  });
});
