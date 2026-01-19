import {
  IntentSpec,
  Plan,
  PlanStep,
  StepResult
} from "@lucidwallet/core";
import {
  ToolRegistry,
  ToolContext,
  chainReadTool,
  quoteRouteTool,
  buildTxTool,
  simulateTxTool,
  signTxTool,
  sendTxTool,
  waitConfirmTool
} from "@lucidwallet/tools";
import { Signer } from "@lucidwallet/wallet-core";
import { ERROR_CODES } from "@lucidwallet/shared";
import { ExecutionStateMachine } from "./state_machine.js";

export type RecoveryOption = "retry" | "adjust_slippage" | "adjust_amount";

const NATIVE_ASSETS = new Set(["ETH"]);
const ASSET_DECIMALS: Record<string, number> = {
  ETH: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18
};

const isNativeAsset = (asset?: string): boolean => {
  if (!asset) {
    return false;
  }
  return NATIVE_ASSETS.has(asset.trim().toUpperCase());
};

const toBaseUnits = (amount: string, decimals: number): string => {
  const normalized = amount.trim();
  if (!normalized) {
    return "0";
  }
  const [wholeRaw, fractionRaw = ""] = normalized.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "");
  const fraction = fractionRaw.replace(/[^0-9]/g, "");
  const paddedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
  const combined = `${whole}${paddedFraction}`.replace(/^0+/, "");
  return combined.length > 0 ? combined : "0";
};

const normalizeAmountForChainRead = (amount: string, asset?: string): string => {
  if (!amount.includes(".")) {
    return amount;
  }
  const symbol = asset?.trim().toUpperCase() ?? "";
  const decimals = ASSET_DECIMALS[symbol] ?? 18;
  return toBaseUnits(amount, decimals);
};

export class Orchestrator {
  private readonly registry = new ToolRegistry();
  private readonly stateMachine = new ExecutionStateMachine();

  constructor(private readonly signer: Signer) {
    this.registry.register(chainReadTool);
    this.registry.register(quoteRouteTool);
    this.registry.register(buildTxTool);
    this.registry.register(simulateTxTool);
    this.registry.register(signTxTool);
    this.registry.register(sendTxTool);
    this.registry.register(waitConfirmTool);
  }

  async execute(intent: IntentSpec): Promise<{ plan: Plan; results: StepResult[] }> {
    const plan = this.createPlan(intent);
    this.stateMachine.transition("PLANNED");
    const stepOutputs = new Map<string, unknown>();

    const context: ToolContext = {
      chain: intent.chain,
      request_id: plan.plan_id,
      signer: this.signer
    };

    this.stateMachine.transition("APPROVED");
    this.stateMachine.transition("EXECUTING");

    for (const step of plan.steps) {
      const resolvedStep = this.resolveStepInput(step, stepOutputs, intent);
      const { result, output } = await this.executeStep(resolvedStep, context);
      this.stateMachine.recordResult(result);
      if (output) {
        stepOutputs.set(step.step_id, output);
      }
      if (result.status === "failed") {
        this.stateMachine.transition("FAILED");
        return { plan, results: this.stateMachine.getResults() };
      }
    }

    this.stateMachine.transition("CONFIRMED");
    this.stateMachine.transition("DONE");

    return { plan, results: this.stateMachine.getResults() };
  }

  plan(intent: IntentSpec): Plan {
    return this.createPlan(intent);
  }

  getRecoveryOptions(): RecoveryOption[] {
    return ["retry", "adjust_slippage", "adjust_amount"];
  }

  private createPlan(intent: IntentSpec): Plan {
    const steps: PlanStep[] = [];
    const needsApprove =
      intent.action_type === "approve" || intent.target_protocol === "approve+swap";
    const assetIn = intent.asset_in ?? "";
    const nativeAsset = isNativeAsset(assetIn);
    const chainReadToken = nativeAsset ? undefined : assetIn;
    const requiredAmount = intent.amount;
    const sendValue = nativeAsset
      ? normalizeAmountForChainRead(intent.amount, assetIn)
      : "0";

    steps.push({
      step_id: "chain_read",
      tool: "chain_read",
      input: {
        address: "0xWALLET",
        token: chainReadToken,
        spender: needsApprove ? "0xSWAP_CONTRACT" : undefined,
        required_amount: requiredAmount,
        required_allowance: needsApprove ? requiredAmount : undefined
      },
      preconditions: [],
      postconditions: ["has_balance"]
    });

    if (needsApprove) {
      steps.push({
        step_id: "build_approve_tx",
        tool: "build_tx",
        input: {
          to: "0xTOKEN_CONTRACT",
          data: "0xAPPROVE",
          value: "0"
        },
        preconditions: ["has_balance"],
        postconditions: ["has_approve_tx"]
      });

      steps.push({
        step_id: "simulate_approve_tx",
        tool: "simulate_tx",
        input: {
          to: "0xTOKEN_CONTRACT",
          data: "0xAPPROVE",
          value: "0"
        },
        preconditions: ["has_approve_tx"],
        postconditions: ["approve_simulated"]
      });

      steps.push({
        step_id: "sign_approve_tx",
        tool: "sign_tx",
        input: {
          chain: intent.chain,
          to: "0xTOKEN_CONTRACT",
          data: "0xAPPROVE",
          value: "0",
          token: intent.asset_in ?? "",
          amount: intent.amount,
          spender: "0xSWAP_CONTRACT"
        },
        preconditions: ["approve_simulated"],
        postconditions: ["approve_signed"]
      });

      steps.push({
        step_id: "send_approve_tx",
        tool: "send_tx",
        input: {
          signed_tx: "0xSIGNED"
        },
        preconditions: ["approve_signed"],
        postconditions: ["approve_sent"]
      });

      steps.push({
        step_id: "wait_confirm_approve",
        tool: "wait_confirm",
        input: {
          tx_hash: "0x0"
        },
        preconditions: ["approve_sent"],
        postconditions: ["approve_confirmed"]
      });
    }

    if (intent.action_type === "send") {
      steps.push({
        step_id: "build_send_tx",
        tool: "build_tx",
        input: {
          to: intent.recipient ?? "",
          data: "0x",
          value: sendValue
        },
        preconditions: ["has_balance"],
        postconditions: ["has_send_tx"]
      });

      steps.push({
        step_id: "simulate_send_tx",
        tool: "simulate_tx",
        input: {
          to: intent.recipient ?? "",
          data: "0x",
          value: sendValue
        },
        preconditions: ["has_send_tx"],
        postconditions: ["send_simulated"]
      });

      steps.push({
        step_id: "sign_send_tx",
        tool: "sign_tx",
        input: {
          chain: intent.chain,
          to: intent.recipient ?? "",
          data: "0x",
          value: sendValue
        },
        preconditions: ["send_simulated"],
        postconditions: ["send_signed"]
      });

      steps.push({
        step_id: "send_send_tx",
        tool: "send_tx",
        input: {
          signed_tx: "0xSIGNED"
        },
        preconditions: ["send_signed"],
        postconditions: ["send_sent"]
      });

      steps.push({
        step_id: "wait_confirm_send",
        tool: "wait_confirm",
        input: {
          tx_hash: "0x0"
        },
        preconditions: ["send_sent"],
        postconditions: ["send_confirmed"]
      });
    }

    if (intent.action_type === "swap") {
      steps.push({
      step_id: "quote_route",
      tool: "quote_route",
      input: {
        asset_in: intent.asset_in ?? "",
        asset_out: intent.asset_out ?? "",
        amount_in: intent.amount,
        slippage: intent.constraints?.slippage
      },
      preconditions: needsApprove ? ["approve_confirmed"] : ["has_balance"],
      postconditions: ["has_quote"]
    });

    steps.push({
      step_id: "build_swap_tx",
      tool: "build_tx",
      input: {
        to: "0xSWAP_CONTRACT",
        data: "0x",
        value: "0"
      },
      preconditions: ["has_quote"],
      postconditions: ["has_tx"]
    });

    steps.push({
      step_id: "simulate_swap_tx",
      tool: "simulate_tx",
      input: {
        to: "0xSWAP_CONTRACT",
        data: "0x",
        value: "0"
      },
      preconditions: ["has_tx"],
      postconditions: ["simulated"]
    });

    steps.push({
      step_id: "sign_swap_tx",
      tool: "sign_tx",
      input: {
        chain: intent.chain,
        to: "0xSWAP_CONTRACT",
        data: "0x",
        value: "0",
        token: intent.asset_in ?? "",
        amount: intent.amount,
        spender: "0xSWAP_CONTRACT"
      },
      preconditions: ["simulated"],
      postconditions: ["signed"]
    });

    steps.push({
      step_id: "send_swap_tx",
      tool: "send_tx",
      input: {
        signed_tx: "0xSIGNED"
      },
      preconditions: ["signed"],
      postconditions: ["sent"]
    });

    steps.push({
      step_id: "wait_confirm_swap",
      tool: "wait_confirm",
      input: {
        tx_hash: "0x0"
      },
      preconditions: ["sent"],
      postconditions: ["confirmed"]
    });
    }

    return {
      plan_id: `plan_${Date.now()}`,
      steps,
      constraints: intent.constraints,
      required_permissions: {
        allowance: needsApprove
          ? [
              {
                token: assetIn,
                spender: "0xSWAP_CONTRACT",
                amount: requiredAmount
              }
            ]
          : [],
        signatures: needsApprove && intent.action_type === "swap" ? 2 : 1
      }
    };
  }

  private resolveStepInput(
    step: PlanStep,
    outputs: Map<string, unknown>,
    intent: IntentSpec
  ): PlanStep {
    const updatedStep = { ...step, input: { ...step.input } };

    if (step.step_id === "simulate_approve_tx") {
      const build = outputs.get("build_approve_tx") as { to: string; data: string; value?: string };
      if (build) {
        updatedStep.input = { ...updatedStep.input, ...build };
      }
    }

    if (step.step_id === "sign_approve_tx") {
      const build = outputs.get("build_approve_tx") as { to: string; data: string; value?: string };
      if (build) {
        updatedStep.input = {
          ...updatedStep.input,
          ...build,
          token: intent.asset_in ?? "",
          amount: intent.amount,
          spender: "0xSWAP_CONTRACT"
        };
      }
    }

    if (step.step_id === "send_approve_tx") {
      const signed = outputs.get("sign_approve_tx") as { signed_tx: string };
      if (signed) {
        updatedStep.input = { ...updatedStep.input, signed_tx: signed.signed_tx };
      }
    }

    if (step.step_id === "wait_confirm_approve") {
      const sent = outputs.get("send_approve_tx") as { tx_hash: string };
      if (sent) {
        updatedStep.input = { ...updatedStep.input, tx_hash: sent.tx_hash };
      }
    }

    if (step.step_id === "simulate_swap_tx") {
      const build = outputs.get("build_swap_tx") as { to: string; data: string; value?: string };
      if (build) {
        updatedStep.input = { ...updatedStep.input, ...build };
      }
    }

    if (step.step_id === "sign_swap_tx") {
      const build = outputs.get("build_swap_tx") as { to: string; data: string; value?: string };
      if (build) {
        updatedStep.input = {
          ...updatedStep.input,
          ...build,
          token: intent.asset_in ?? "",
          amount: intent.amount,
          spender: "0xSWAP_CONTRACT"
        };
      }
    }

    if (step.step_id === "simulate_send_tx") {
      const build = outputs.get("build_send_tx") as { to: string; data: string; value?: string };
      if (build) {
        updatedStep.input = { ...updatedStep.input, ...build };
      }
    }

    if (step.step_id === "sign_send_tx") {
      const build = outputs.get("build_send_tx") as { to: string; data: string; value?: string };
      if (build) {
        updatedStep.input = { ...updatedStep.input, ...build };
      }
    }

    if (step.step_id === "send_send_tx") {
      const signed = outputs.get("sign_send_tx") as { signed_tx: string };
      if (signed) {
        updatedStep.input = { ...updatedStep.input, signed_tx: signed.signed_tx };
      }
    }

    if (step.step_id === "wait_confirm_send") {
      const sent = outputs.get("send_send_tx") as { tx_hash: string };
      if (sent) {
        updatedStep.input = { ...updatedStep.input, tx_hash: sent.tx_hash };
      }
    }

    if (step.step_id === "send_swap_tx") {
      const signed = outputs.get("sign_swap_tx") as { signed_tx: string };
      if (signed) {
        updatedStep.input = { ...updatedStep.input, signed_tx: signed.signed_tx };
      }
    }

    if (step.step_id === "wait_confirm_swap") {
      const sent = outputs.get("send_swap_tx") as { tx_hash: string };
      if (sent) {
        updatedStep.input = { ...updatedStep.input, tx_hash: sent.tx_hash };
      }
    }

    return updatedStep;
  }

  private async executeStep(
    step: PlanStep,
    context: ToolContext
  ): Promise<{ result: StepResult; output?: unknown }> {
    try {
      const tool = this.registry.get(step.tool);
      const input = tool.inputSchema.parse(step.input);
      const output = await tool.handler(input, context);
      tool.outputSchema.parse(output);

      if (step.tool === "chain_read") {
        const { required_amount, required_allowance } = step.input as {
          required_amount?: string;
          required_allowance?: string;
        };
        const parsed = output as { balance: string; allowance?: string };
        if (required_amount && !required_amount.includes(".")) {
          if (BigInt(parsed.balance) < BigInt(required_amount)) {
            throw new Error("insufficient_balance");
          }
        }
        if (
          required_allowance &&
          !required_allowance.includes(".") &&
          parsed.allowance &&
          BigInt(parsed.allowance) < BigInt(required_allowance)
        ) {
          throw new Error("insufficient_allowance");
        }
      }

      if (step.tool === "simulate_tx") {
        return {
          result: {
          step_id: step.step_id,
          status: "success",
          simulation: output as Record<string, unknown>
          },
          output
        };
      }

      if (step.tool === "send_tx") {
        return {
          result: {
          step_id: step.step_id,
          status: "success",
          tx_hash: (output as { tx_hash: string }).tx_hash
          },
          output
        };
      }

      if (step.tool === "wait_confirm") {
        return {
          result: {
          step_id: step.step_id,
          status: "success",
          receipt: (output as { receipt?: Record<string, unknown> }).receipt
          },
          output
        };
      }

      return {
        result: {
          step_id: step.step_id,
          status: "success"
        },
        output
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      return {
        result: {
          step_id: step.step_id,
          status: "failed",
          error: {
            code: this.mapErrorCode(message),
            message
          }
        }
      };
    }
  }

  private mapErrorCode(message: string): string {
    const normalized = message.toLowerCase();
    if (normalized.includes("insufficient_balance") || normalized.includes("balance")) {
      return ERROR_CODES.INSUFFICIENT_BALANCE;
    }
    if (normalized.includes("insufficient_allowance") || normalized.includes("allowance")) {
      return ERROR_CODES.INSUFFICIENT_ALLOWANCE;
    }
    if (normalized.includes("slippage")) {
      return ERROR_CODES.SLIPPAGE_TOO_HIGH;
    }
    if (normalized.includes("nonce")) {
      return ERROR_CODES.NONCE_CONFLICT;
    }
    return ERROR_CODES.REVERT;
  }
}
