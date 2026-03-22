import fs from "node:fs/promises";
import path from "node:path";
import { IntentSpec, MvpIntent, StepResult, consentScopeSchema } from "@lucidwallet/core";
import { mapErrorCode } from "./error_codes.js";
import { ToolRegistry } from "@lucidwallet/tools";
import { simulateTransferTool } from "@lucidwallet/tools";
import { parseIntent } from "./intents/parse_intent.js";
import { parseNaturalLanguageIntent } from "./intents/nl/parse_nl_intent.js";
import { buildPlan } from "./plans/build_plan.js";
import { logRun } from "./log_run.js";
import { Orchestrator } from "./orchestrator.js";
import { Signer } from "@lucidwallet/wallet-core";

const mvpToIntentSpec = (intent: MvpIntent): IntentSpec => ({
  action_type: intent.action,
  chain: intent.chain,
  asset_in: intent.asset,
  amount: intent.amount,
  recipient: intent.to
});

const getArg = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
};

const loadSampleIntent = async (
  sampleFile: string,
  index: number
): Promise<string> => {
  const raw = await fs.readFile(sampleFile, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("sample_file_empty");
  }
  const entry = parsed[Math.max(0, Math.min(index, parsed.length - 1))];
  return JSON.stringify(entry);
};


const buildScopeAndOrchestrator = (spec: IntentSpec) => {
  if (!process.env.LUCIDWALLET_USE_STUBS) {
    process.env.LUCIDWALLET_USE_STUBS = "true";
  }
  const scope = consentScopeSchema.parse({
    chain: spec.chain,
    spender_allowlist: ["0xSWAP_CONTRACT"],
    tokens: spec.asset_in ? [spec.asset_in] : [],
    max_amount: spec.amount,
    expiry: Date.now() + 60_000,
    risk_level: "low"
  });
  return new Orchestrator(new Signer(scope));
};

const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const intentNl = getArg(args, "--intent-nl") ?? getArg(args, "--nl");
  const nlTemplateFile = getArg(args, "--nl-template-file");
  const intentRaw = getArg(args, "--intent");
  const intentFile = getArg(args, "--intent-file");
  const sampleIndexRaw = getArg(args, "--sample-index");
  const engine = getArg(args, "--engine") ?? "mock";
  const sampleFile =
    getArg(args, "--sample-file") ??
    path.join(process.cwd(), "datasets", "mvp-samples", "intent_samples.json");

  let intentSpec: IntentSpec | undefined;
  let intent: MvpIntent | undefined;
  let plan;
  let results: StepResult[] = [];

  try {
    if (intentNl) {
      intentSpec = await parseNaturalLanguageIntent(intentNl, {
        templateFile: nlTemplateFile
      });
      const orchestrator = buildScopeAndOrchestrator(intentSpec);

      if (dryRun) {
        plan = orchestrator.plan(intentSpec);
        console.log(JSON.stringify({ dry_run: true, plan }, null, 2));
        return;
      }

      const execution = await orchestrator.execute(intentSpec);
      plan = execution.plan;
      results = execution.results;
      const logFile = await logRun({
        intent: { nl: intentNl, intent_spec: intentSpec },
        plan,
        results
      });
      console.log("NL 执行完成。");
      console.log(JSON.stringify({ plan, results }, null, 2));
      console.log(`日志已写入: ${logFile}`);
      return;
    } else {
      let rawIntent = intentRaw ?? "";
      if (!rawIntent) {
        if (intentFile) {
          rawIntent = await fs.readFile(intentFile, "utf8");
        } else {
          const index = sampleIndexRaw ? Number.parseInt(sampleIndexRaw, 10) : 0;
          rawIntent = await loadSampleIntent(sampleFile, Number.isNaN(index) ? 0 : index);
        }
      }
      intent = parseIntent(rawIntent);
    }

    if (engine === "orchestrator") {
      intentSpec = mvpToIntentSpec(intent);
      const orchestrator = buildScopeAndOrchestrator(intentSpec);

      if (dryRun) {
        plan = orchestrator.plan(intentSpec);
        console.log(JSON.stringify({ dry_run: true, plan }, null, 2));
        return;
      }

      const execution = await orchestrator.execute(intentSpec);
      plan = execution.plan;
      results = execution.results;
      const logFile = await logRun({
        intent: { intent_spec: intentSpec },
        plan,
        results
      });
      console.log("Orchestrator 执行完成。");
      console.log(JSON.stringify({ plan, results }, null, 2));
      console.log(`日志已写入: ${logFile}`);
      return;
    }

    plan = buildPlan(intent);

    if (dryRun) {
      console.log(JSON.stringify({ dry_run: true, plan }, null, 2));
      return;
    }

    const registry = new ToolRegistry();
    registry.register(simulateTransferTool);
    const tool = registry.get("simulate_transfer") as typeof simulateTransferTool;

    const input = tool.inputSchema.parse(plan.steps[0].input);
    const output = await tool.handler(input, {
      chain: intent.chain,
      request_id: plan.plan_id
    });
    tool.outputSchema.parse(output);

    results = [
      {
        step_id: plan.steps[0].step_id,
        status: "success",
        simulation: output,
        tx_hash: output.tx_hash
      }
    ];

    const logFile = await logRun({ intent, plan, results });
    console.log("MVP 模拟执行完成。");
    console.log(JSON.stringify({ plan, results }, null, 2));
    console.log(`日志已写入: ${logFile}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const code = mapErrorCode(message);
    results = [
      {
        step_id: plan?.steps?.[0]?.step_id ?? "simulate_transfer",
        status: "failed",
        error: { code, message }
      }
    ];
    const logFile = await logRun({
      intent: intentSpec ? { nl: intentNl, intent_spec: intentSpec } : intent,
      plan,
      results,
      error: { code, message }
    });
    console.error("MVP 模拟执行失败。");
    console.error(JSON.stringify({ error: { code, message } }, null, 2));
    console.error(`日志已写入: ${logFile}`);
    process.exitCode = 1;
  }
};

run();
